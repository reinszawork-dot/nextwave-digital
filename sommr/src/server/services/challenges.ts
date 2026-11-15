import 'server-only';
import { getCity } from '@/lib/cities';
import { addDays, dateKey, saParts, weekKey } from '@/lib/time';
import { maybeOne, query, sql, transaction } from '../db';
import type { SessionUser } from '../auth';
import { evaluateAchievements } from './achievements';
import { UserError } from '../errors';

export interface Challenge {
  id: string;
  slug: string;
  kind: 'daily' | 'weekly';
  title: string;
  description: string;
  tip: string | null;
  interests: string[];
  cost: 'free' | 'low' | 'medium';
  points: number;
  place_category: string | null;
  coastal_only: boolean;
  months: number[];
  featured: boolean;
  active: boolean;
}

export interface Assignment {
  id: string;
  period: 'daily' | 'weekly';
  periodKey: string;
  status: 'assigned' | 'completed';
  completedAt: Date | null;
  note: string | null;
  swapsUsed: number;
  challenge: Challenge;
}

/** Small deterministic PRNG so a user's challenge for a day is stable but varied. */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pick a challenge for a user and period: suits their city (no beach challenges
 * inland), the month, and leans towards their interests; avoids recent repeats.
 */
export function pickChallenge(
  pool: Challenge[],
  opts: { interests: string[]; coastal: boolean; month: number; recentIds: Set<string>; seed: string; excludeIds?: Set<string> },
): Challenge | null {
  const eligible = pool.filter(
    (c) =>
      c.active &&
      (!c.coastal_only || opts.coastal) &&
      (c.months.length === 0 || c.months.includes(opts.month)) &&
      !opts.excludeIds?.has(c.id),
  );
  if (eligible.length === 0) return null;
  const fresh = eligible.filter((c) => !opts.recentIds.has(c.id));
  const candidates = fresh.length > 0 ? fresh : eligible;
  const weights = candidates.map((c) => {
    let w = c.interests.length === 0 ? 1.4 : c.interests.some((i) => opts.interests.includes(i)) ? 3 : 0.5;
    if (c.featured) w *= 2;
    if (c.cost === 'free') w *= 1.25; // keep summer affordable
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = seededRandom(opts.seed)() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

function periodKeyFor(period: 'daily' | 'weekly', now: Date) {
  return period === 'daily' ? dateKey(now) : weekKey(now);
}

async function loadAssignment(userId: string, period: 'daily' | 'weekly', key: string): Promise<Assignment | null> {
  const row = await maybeOne<Record<string, unknown>>(sql`
    select uc.id as uc_id, uc.status, uc.completed_at, uc.note,
      (select count(*)::int from user_challenges s
        where s.user_id = uc.user_id and s.period = uc.period and s.period_key = uc.period_key and s.status = 'swapped') as swaps,
      c.*
    from user_challenges uc join challenges c on c.id = uc.challenge_id
    where uc.user_id = ${userId} and uc.period = ${period} and uc.period_key = ${key} and uc.status <> 'swapped'`);
  if (!row) return null;
  return {
    id: row.uc_id as string,
    period,
    periodKey: key,
    status: row.status as 'assigned' | 'completed',
    completedAt: (row.completed_at as Date) ?? null,
    note: (row.note as string) ?? null,
    swapsUsed: row.swaps as number,
    challenge: row as unknown as Challenge,
  };
}

async function assign(user: SessionUser, period: 'daily' | 'weekly', key: string, now: Date, exclude?: Set<string>) {
  const pool = await query<Challenge & Record<string, unknown>>(sql`
    select * from challenges where kind = ${period} and active`);
  const recent = await query<{ challenge_id: string }>(sql`
    select challenge_id from user_challenges
    where user_id = ${user.id} and period = ${period} and assigned_at > now() - interval '21 days'`);
  const swaps = exclude?.size ?? 0;
  const city = getCity(user.citySlug);
  const choice = pickChallenge(pool, {
    interests: user.interests,
    coastal: city?.coastal ?? false,
    month: saParts(now).month,
    recentIds: new Set(recent.map((r) => r.challenge_id)),
    excludeIds: exclude,
    seed: `${user.id}:${period}:${key}:${swaps}`,
  });
  if (!choice) return null;
  await query(sql`
    insert into user_challenges (user_id, challenge_id, period, period_key)
    values (${user.id}, ${choice.id}, ${period}, ${key})
    on conflict do nothing`);
  return loadAssignment(user.id, period, key);
}

/** Today's (or this week's) challenge for the user, assigning one on first view. */
export async function getCurrentChallenge(user: SessionUser, period: 'daily' | 'weekly', now = new Date()) {
  const key = periodKeyFor(period, now);
  return (await loadAssignment(user.id, period, key)) ?? (await assign(user, period, key, now));
}

export const MAX_SWAPS = 2;

/** Swap the current challenge for another (limited per period). */
export async function swapChallenge(user: SessionUser, period: 'daily' | 'weekly', now = new Date()) {
  const key = periodKeyFor(period, now);
  const current = await loadAssignment(user.id, period, key);
  if (!current) return getCurrentChallenge(user, period, now);
  if (current.status === 'completed') throw new UserError('Completed challenges can’t be swapped.');
  if (current.swapsUsed >= MAX_SWAPS) throw new UserError('You’ve used all your swaps for this one.');
  const swapped = await query<{ challenge_id: string }>(sql`
    select challenge_id from user_challenges
    where user_id = ${user.id} and period = ${period} and period_key = ${key}`);
  await query(sql`update user_challenges set status = 'swapped' where id = ${current.id}`);
  return assign(user, period, key, now, new Set(swapped.map((s) => s.challenge_id)));
}

/** Mark a challenge complete, award its points and check achievements. Idempotent. */
export async function completeChallenge(user: SessionUser, assignmentId: string, note: string | null) {
  const result = await transaction(async (t) => {
    const [row] = await t.query<{ id: string; points: number; status: string; title: string }>(sql`
      select uc.id, uc.status, c.points, c.title
      from user_challenges uc join challenges c on c.id = uc.challenge_id
      where uc.id = ${assignmentId} and uc.user_id = ${user.id} and uc.status <> 'swapped'
      for update of uc`);
    if (!row) throw new UserError('That challenge no longer exists.');
    if (row.status === 'completed') return { points: 0, title: row.title, already: true };
    await t.query(sql`
      update user_challenges set status = 'completed', completed_at = now(), note = ${note}, points = ${row.points}
      where id = ${row.id}`);
    await t.query(sql`
      insert into points_ledger (user_id, amount, reason, ref)
      values (${user.id}, ${row.points}, 'challenge', ${row.id})
      on conflict do nothing`);
    return { points: row.points, title: row.title, already: false };
  });
  const earned = result.already ? [] : await evaluateAchievements(user.id);
  return { ...result, earned };
}

/** Undo an accidental completion (removes the points too). */
export async function uncompleteChallenge(user: SessionUser, assignmentId: string) {
  await transaction(async (t) => {
    await t.query(sql`
      update user_challenges set status = 'assigned', completed_at = null, points = 0
      where id = ${assignmentId} and user_id = ${user.id} and status = 'completed'`);
    await t.query(sql`delete from points_ledger where user_id = ${user.id} and reason = 'challenge' and ref = ${assignmentId}`);
  });
}

export async function totalPoints(userId: string): Promise<number> {
  const row = await maybeOne<{ n: number }>(sql`select coalesce(sum(amount), 0)::int as n from points_ledger where user_id = ${userId}`);
  return row?.n ?? 0;
}

/** Current and best streak of consecutive days with a completed daily challenge. */
export async function streaks(userId: string, now = new Date()): Promise<{ current: number; best: number }> {
  const rows = await query<{ period_key: string }>(sql`
    select distinct period_key from user_challenges
    where user_id = ${userId} and period = 'daily' and status = 'completed'
    order by period_key`);
  const days = rows.map((r) => r.period_key);
  return computeStreaks(days, dateKey(now));
}

export function computeStreaks(sortedDays: string[], today: string): { current: number; best: number } {
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sortedDays) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  const set = new Set(sortedDays);
  let current = 0;
  // A streak stays alive until the end of today even if today isn't done yet.
  let cursor = set.has(today) ? today : addDays(today, -1);
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, best };
}

export interface ChallengeHistoryItem {
  id: string;
  period: 'daily' | 'weekly';
  period_key: string;
  completed_at: Date;
  points: number;
  note: string | null;
  title: string;
  slug: string;
}

export async function challengeHistory(userId: string, limit = 50): Promise<ChallengeHistoryItem[]> {
  return query<ChallengeHistoryItem & Record<string, unknown>>(sql`
    select uc.id, uc.period, uc.period_key, uc.completed_at, uc.points, uc.note, c.title, c.slug
    from user_challenges uc join challenges c on c.id = uc.challenge_id
    where uc.user_id = ${userId} and uc.status = 'completed'
    order by uc.completed_at desc
    limit ${limit}`);
}

export async function challengeCounts(userId: string): Promise<{ daily: number; weekly: number }> {
  const row = await maybeOne<{ daily: number; weekly: number }>(sql`
    select count(*) filter (where period = 'daily')::int as daily,
           count(*) filter (where period = 'weekly')::int as weekly
    from user_challenges where user_id = ${userId} and status = 'completed'`);
  return row ?? { daily: 0, weekly: 0 };
}
