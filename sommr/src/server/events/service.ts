import 'server-only';
import { addDays, dateKey, saMidnight, saParts } from '@/lib/time';
import { maybeOne, query, sql } from '../db';
import type { SqlFragment } from '../sql';

export interface EventRow {
  id: string;
  source: string;
  source_url: string | null;
  title: string;
  description: string | null;
  category_slug: string;
  starts_at: Date;
  ends_at: Date | null;
  all_day: boolean;
  venue_name: string | null;
  address: string | null;
  city_slug: string | null;
  lat: number | null;
  lng: number | null;
  price_min: number | null;
  price_max: number | null;
  currency: string;
  is_free: boolean | null;
  ticket_url: string | null;
  image_url: string | null;
  organiser: string | null;
  status: string;
  featured: boolean;
  featured_note: string | null;
  last_seen_at: Date | null;
  updated_at: Date;
  created_at: Date;
  saved: boolean;
  source_name: string | null;
  distance_km: number | null;
}

export type DateFilter = 'today' | 'weekend' | 'week' | 'month' | 'all' | `on:${string}`;
export type PriceFilter = 'any' | 'free' | 'under-200' | '200-500' | 'over-500';

export interface EventFilters {
  city?: string | null;
  when?: DateFilter;
  categories?: string[];
  price?: PriceFilter;
  near?: { lat: number; lng: number; km: number } | null;
  q?: string;
  featuredOnly?: boolean;
  withCoords?: boolean;
  limit?: number;
}

/** The [from, to) window for a date filter, in South African time. */
export function dateWindow(when: DateFilter = 'all', now = new Date()): { from: Date; to: Date } {
  const today = dateKey(now);
  switch (true) {
    case when === 'today':
      return { from: now, to: saMidnight(addDays(today, 1)) };
    case when === 'weekend': {
      // Friday 17:00 until Sunday night, in South African time.
      const wd = saParts(now).weekday;
      if (wd === 6 || wd === 0) return { from: now, to: saMidnight(addDays(today, wd === 6 ? 2 : 1)) };
      const friday = addDays(today, 5 - wd);
      const start = new Date(saMidnight(friday).getTime() + 17 * 3_600_000);
      return { from: start < now ? now : start, to: saMidnight(addDays(friday, 3)) };
    }
    case when === 'week':
      return { from: now, to: saMidnight(addDays(today, 7)) };
    case when === 'month':
      return { from: now, to: saMidnight(addDays(today, 31)) };
    case typeof when === 'string' && when.startsWith('on:'): {
      const day = when.slice(3);
      if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        const start = saMidnight(day);
        return { from: start < now ? now : start, to: saMidnight(addDays(day, 1)) };
      }
      return { from: now, to: saMidnight(addDays(today, 180)) };
    }
    default:
      return { from: now, to: saMidnight(addDays(today, 180)) };
  }
}

const END = sql.raw(`coalesce(e.ends_at, e.starts_at + interval '6 hours')`);

function priceClause(p: PriceFilter | undefined): SqlFragment | null {
  switch (p) {
    case 'free':
      return sql`(e.is_free or e.price_max = 0)`;
    case 'under-200':
      return sql`(e.is_free or e.price_min < 200)`;
    case '200-500':
      return sql`e.price_min between 200 and 500`;
    case 'over-500':
      return sql`e.price_min > 500`;
    default:
      return null;
  }
}

function distanceExpr(lat: number, lng: number): SqlFragment {
  const cos = Math.cos((lat * Math.PI) / 180);
  return sql`sqrt(power((e.lat - ${lat}) * 111.32, 2) + power((e.lng - ${lng}) * ${111.32 * cos}, 2))`;
}

/** Upcoming, published events matching the filters. Never returns events that have finished. */
export async function listEvents(f: EventFilters, userId: string | null, now = new Date()): Promise<EventRow[]> {
  const { from, to } = dateWindow(f.when, now);
  const dist = f.near ? distanceExpr(f.near.lat, f.near.lng) : null;
  const where = sql.and([
    sql`e.status = 'published'`,
    sql`${END} >= ${from}`,
    sql`e.starts_at < ${to}`,
    f.city ? sql`e.city_slug = ${f.city}` : null,
    f.categories?.length ? sql`e.category_slug = any(${f.categories})` : null,
    priceClause(f.price),
    f.near && dist ? sql`e.lat is not null and ${dist} <= ${f.near.km}` : null,
    f.withCoords ? sql`e.lat is not null` : null,
    f.featuredOnly ? sql`e.featured` : null,
    f.q ? sql`(e.title ilike ${'%' + f.q.replace(/[%_\\]/g, '\\$&') + '%'} or e.venue_name ilike ${'%' + f.q.replace(/[%_\\]/g, '\\$&') + '%'})` : null,
  ]);
  return query<EventRow & Record<string, unknown>>(sql`
    select e.*, s.name as source_name,
      (se.user_id is not null) as saved,
      ${dist ?? sql`null::float8`} as distance_km
    from events e
    left join event_sources s on s.id = e.source_ref
    left join saved_events se on se.event_id = e.id and se.user_id = ${userId}
    where ${where}
    order by e.starts_at, e.featured desc, e.title
    limit ${f.limit ?? 200}`);
}

/** Featured first, then the soonest events, leaning towards the user's interests. */
export async function eventsForDashboard(opts: {
  city: string | null;
  near: { lat: number; lng: number } | null;
  categories: string[];
  userId: string;
  limit?: number;
}): Promise<EventRow[]> {
  const now = new Date();
  const to = saMidnight(addDays(dateKey(now), 21));
  const dist = opts.near ? distanceExpr(opts.near.lat, opts.near.lng) : null;
  const local = sql.and([
    opts.city ? sql`e.city_slug = ${opts.city}` : null,
    !opts.city && dist ? sql`e.lat is not null and ${dist} <= 60` : null,
  ]);
  return query<EventRow & Record<string, unknown>>(sql`
    select e.*, s.name as source_name, (se.user_id is not null) as saved, null::float8 as distance_km
    from events e
    left join event_sources s on s.id = e.source_ref
    left join saved_events se on se.event_id = e.id and se.user_id = ${opts.userId}
    where e.status = 'published' and ${END} >= ${now} and e.starts_at < ${to} and ${local}
    order by e.featured desc,
      (e.category_slug = any(${opts.categories}))::int desc,
      e.starts_at
    limit ${opts.limit ?? 6}`);
}

export async function getEvent(id: string, userId: string | null): Promise<EventRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return maybeOne<EventRow & Record<string, unknown>>(sql`
    select e.*, s.name as source_name, (se.user_id is not null) as saved, null::float8 as distance_km
    from events e
    left join event_sources s on s.id = e.source_ref
    left join saved_events se on se.event_id = e.id and se.user_id = ${userId}
    where e.id = ${id}`);
}

export async function setEventSaved(userId: string, eventId: string, saved: boolean) {
  if (saved) {
    await query(sql`insert into saved_events (user_id, event_id) values (${userId}, ${eventId}) on conflict do nothing`);
  } else {
    await query(sql`delete from saved_events where user_id = ${userId} and event_id = ${eventId}`);
  }
}

export async function savedEvents(userId: string, includePast = false): Promise<EventRow[]> {
  return query<EventRow & Record<string, unknown>>(sql`
    select e.*, s.name as source_name, true as saved, null::float8 as distance_km
    from saved_events se join events e on e.id = se.event_id
    left join event_sources s on s.id = e.source_ref
    where se.user_id = ${userId} and e.status in ('published', 'cancelled', 'archived')
      ${includePast ? sql.empty : sql`and ${END} >= now()`}
    order by e.starts_at`);
}

/** Counts per city for the city switcher (upcoming only). */
export async function eventCountsByCity(): Promise<Record<string, number>> {
  const rows = await query<{ city_slug: string; n: number }>(sql`
    select e.city_slug, count(*)::int as n from events e
    where e.status = 'published' and ${END} >= now() and e.city_slug is not null
    group by e.city_slug`);
  return Object.fromEntries(rows.map((r) => [r.city_slug, r.n]));
}

/** When events were last refreshed from providers (for honest "updated" labels). */
export async function lastImportAt(): Promise<Date | null> {
  const row = await maybeOne<{ at: Date | null }>(sql`
    select max(finished_at) as at from import_runs where status = 'ok'`);
  return row?.at ?? null;
}

export function priceLabel(e: Pick<EventRow, 'is_free' | 'price_min' | 'price_max' | 'currency'>): string | null {
  if (e.is_free || (e.price_max === 0 && e.price_min === 0)) return 'Free';
  if (e.price_min == null) return null;
  const fmt = (n: number) => (e.currency === 'ZAR' ? `R${Math.round(n).toLocaleString('en-ZA')}` : `${e.currency} ${n}`);
  if (e.price_max != null && e.price_max > e.price_min) return `${fmt(e.price_min)}–${fmt(e.price_max)}`;
  return e.price_min === 0 ? 'From free' : `From ${fmt(e.price_min)}`;
}
