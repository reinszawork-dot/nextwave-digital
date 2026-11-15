/**
 * Integration tests against a real (embedded) PostgreSQL: the full schema is
 * migrated into a temporary PGlite database. Event fixtures are synthetic.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ImportedEvent } from '@/server/events/types';

const dir = mkdtempSync(join(tmpdir(), 'sommr-test-'));
process.env.PGLITE_DIR = dir;
delete process.env.DATABASE_URL;

type Db = typeof import('@/server/db');
let db: Db;
let importer: typeof import('@/server/events/importer');
let events: typeof import('@/server/events/service');
let challenges: typeof import('@/server/services/challenges');
let auth: typeof import('@/server/auth');
let sourceId: string;
let userId: string;

const NOW = Date.now();
const future = (days: number) => new Date(Math.floor((NOW + days * 86_400_000) / 60_000) * 60_000);
const ev = (id: string, patch: Partial<ImportedEvent> = {}): ImportedEvent => ({
  sourceId: id,
  title: `Test event ${id}`,
  startsAt: future(3),
  venueName: 'Test Venue',
  lat: -33.92,
  lng: 18.42,
  priceMin: 100,
  priceMax: 200,
  categoryHints: ['Music'],
  ...patch,
});

beforeAll(async () => {
  db = await import('@/server/db');
  importer = await import('@/server/events/importer');
  events = await import('@/server/events/service');
  challenges = await import('@/server/services/challenges');
  auth = await import('@/server/auth');
  await db.getDb(); // migrates and seeds
  const s = await db.one<{ id: string }>(db.sql`insert into event_sources (kind, name, url, city_slug) values ('ical', 'Test feed', 'https://example.com/test.ics', 'cape-town') returning id`);
  sourceId = s.id;
  const u = await db.one<{ id: string }>(db.sql`
    insert into users (email, password_hash, display_name, city_slug, interests, onboarded_at)
    values ('inland@example.com', 'x', 'Test', 'johannesburg', '{food,music}', now()) returning id`);
  userId = u.id;
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('database setup', () => {
  it('seeds categories and challenges', async () => {
    const [{ n }] = await db.query<{ n: number }>(db.sql`select count(*)::int as n from challenges`);
    expect(n).toBeGreaterThan(40);
  });
});

describe('event import pipeline', () => {
  const source = () => ({ id: sourceId, kind: 'ical' as const, city_slug: 'cape-town', default_category: null });
  const cats = () => [{ slug: 'music', keywords: ['concert'] }, { slug: 'festival', keywords: ['festival'] }, { slug: 'other', keywords: [] }];

  it('creates, then leaves unchanged events alone', async () => {
    const first = await importer.storeEvents(source(), { events: [ev('a'), ev('b'), ev('past', { startsAt: new Date(Date.now() - 3 * 86_400_000) })], complete: true }, cats());
    expect(first).toMatchObject({ created: 2, skipped: 1 });
    const again = await importer.storeEvents(source(), { events: [ev('a'), ev('b')], complete: true }, cats());
    expect(again).toMatchObject({ created: 0, unchanged: 2, removed: 0 });
  });

  it('updates changed events but keeps admin corrections', async () => {
    await db.query(db.sql`update events set title = 'Corrected title', locked_fields = '{title}' where source_id = 'a'`);
    const r = await importer.storeEvents(source(), { events: [ev('a', { title: 'Provider title', priceMin: 120 }), ev('b')], complete: true }, cats());
    expect(r.updated).toBe(1);
    const a = await db.one<{ title: string; price_min: number }>(db.sql`select title, price_min from events where source_id = 'a'`);
    expect(a).toEqual({ title: 'Corrected title', price_min: 120 });
  });

  it('archives events that disappear from a complete feed, and flags cancellations', async () => {
    const r = await importer.storeEvents(source(), { events: [ev('a', { cancelled: true })], complete: true }, cats());
    expect(r.removed).toBe(1);
    const rows = await db.query<{ source_id: string; status: string }>(db.sql`select source_id, status from events where source_ref = ${sourceId} order by source_id`);
    expect(rows).toEqual([
      { source_id: 'a', status: 'cancelled' },
      { source_id: 'b', status: 'archived' },
    ]);
  });

  it('never lists events that have finished, even before archiving runs', async () => {
    await db.query(db.sql`
      insert into events (source, title, category_slug, starts_at, city_slug, status)
      values ('admin', 'Finished test event', 'music', now() - interval '10 hours', 'cape-town', 'published'),
             ('admin', 'Upcoming test event', 'music', now() + interval '2 days', 'cape-town', 'published'),
             ('admin', 'Free test picnic', 'outdoor', now() + interval '3 days', 'cape-town', 'published')`);
    await db.query(db.sql`update events set is_free = true where title = 'Free test picnic'`);
    const list = await events.listEvents({ city: 'cape-town', when: 'all' }, null);
    const titles = list.map((e) => e.title);
    expect(titles).toContain('Upcoming test event');
    expect(titles).not.toContain('Finished test event');
    const free = await events.listEvents({ city: 'cape-town', when: 'all', price: 'free' }, null);
    expect(free.map((e) => e.title)).toEqual(['Free test picnic']);
    const music = await events.listEvents({ city: 'cape-town', when: 'all', categories: ['music'] }, null);
    expect(music.every((e) => e.category_slug === 'music')).toBe(true);
    expect(await importer.archiveExpired()).toBeGreaterThanOrEqual(1);
  });
});

describe('challenges', () => {
  const user = () => ({
    id: userId, email: 'inland@example.com', displayName: 'Test', role: 'user' as const, citySlug: 'johannesburg', homeLat: null, homeLng: null,
    locationMode: 'city' as const, interests: ['food', 'music'], onboarded: true, createdAt: new Date(),
  });

  it('assigns a stable daily challenge that suits an inland city', async () => {
    const a = await challenges.getCurrentChallenge(user(), 'daily');
    const b = await challenges.getCurrentChallenge(user(), 'daily');
    expect(a!.id).toBe(b!.id);
    expect(a!.challenge.coastal_only).toBe(false);
  });

  it('swaps a limited number of times and awards points once', async () => {
    const before = await challenges.getCurrentChallenge(user(), 'daily');
    const swapped = await challenges.swapChallenge(user(), 'daily');
    expect(swapped!.challenge.id).not.toBe(before!.challenge.id);
    await challenges.swapChallenge(user(), 'daily');
    await expect(challenges.swapChallenge(user(), 'daily')).rejects.toThrow(/swaps/);
    const current = await challenges.getCurrentChallenge(user(), 'daily');
    const r1 = await challenges.completeChallenge(user(), current!.id, 'Loved it');
    const r2 = await challenges.completeChallenge(user(), current!.id, null);
    expect(r1.points).toBe(current!.challenge.points);
    expect(r2.already).toBe(true);
    expect(await challenges.totalPoints(userId)).toBe(current!.challenge.points);
    expect(r1.earned.map((e) => e.slug)).toContain('first-step');
  });

  it('never picks coastal challenges inland', () => {
    const pool = [
      { id: '1', coastal_only: true, months: [], interests: [], active: true, featured: false, cost: 'free' },
      { id: '2', coastal_only: false, months: [12], interests: [], active: true, featured: false, cost: 'free' },
      { id: '3', coastal_only: false, months: [], interests: ['food'], active: true, featured: false, cost: 'low' },
    ] as unknown as import('@/server/services/challenges').Challenge[];
    for (let i = 0; i < 25; i++) {
      const c = challenges.pickChallenge(pool, { interests: ['food'], coastal: false, month: 11, recentIds: new Set(), seed: `s${i}` });
      expect(c!.id).toBe('3');
    }
  });

  it('computes streaks', () => {
    expect(challenges.computeStreaks(['2026-12-01', '2026-12-02', '2026-12-03', '2026-12-05'], '2026-12-05')).toEqual({ current: 1, best: 3 });
    expect(challenges.computeStreaks(['2026-12-03', '2026-12-04'], '2026-12-05')).toEqual({ current: 2, best: 2 });
    expect(challenges.computeStreaks(['2026-12-01'], '2026-12-05')).toEqual({ current: 0, best: 1 });
  });
});

describe('security', () => {
  it('hashes passwords with scrypt and verifies them', async () => {
    const h = await auth.hashPassword('correct horse battery');
    expect(h).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(await auth.verifyPassword('correct horse battery', h)).toBe(true);
    expect(await auth.verifyPassword('wrong', h)).toBe(false);
    expect(await auth.hashPassword('correct horse battery')).not.toBe(h); // salted
  });

  it('refuses to fetch private or local addresses', async () => {
    const { safeFetchText } = await import('@/server/safe-fetch');
    for (const url of ['http://127.0.0.1/', 'http://localhost:3000/', 'http://10.0.0.5/feed.ics', 'http://169.254.169.254/latest/meta-data', 'file:///etc/passwd', 'http://[::1]/']) {
      await expect(safeFetchText(url)).rejects.toThrow(/reachable|Only http/);
    }
  });

  it('limits repeated attempts', async () => {
    for (let i = 0; i < 3; i++) expect(await auth.rateLimit('test:bucket', 3, 60)).toBe(true);
    expect(await auth.rateLimit('test:bucket', 3, 60)).toBe(false);
  });
});
