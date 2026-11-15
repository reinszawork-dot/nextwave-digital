import 'server-only';
import { ACHIEVEMENTS, type AchievementDef, type AchievementStats } from '@/lib/achievements';
import { maybeOne, query, sql } from '../db';
import { computeStreaks } from './challenges';
import { dateKey } from '@/lib/time';

export async function achievementStats(userId: string): Promise<AchievementStats> {
  const row = await maybeOne<Record<string, number>>(sql`
    select
      (select count(*) from user_challenges where user_id = ${userId} and status = 'completed')::int as challenges_done,
      (select count(*) from user_challenges where user_id = ${userId} and status = 'completed' and period = 'weekly')::int as weekly_done,
      (select count(*) from bucket_items where user_id = ${userId})::int as bucket_added,
      (select count(*) from bucket_items where user_id = ${userId} and completed_at is not null)::int as bucket_done,
      (select count(*) from memories where user_id = ${userId})::int as memories,
      (select count(*) from memory_photos mp join memories m on m.id = mp.memory_id where m.user_id = ${userId})::int as photos,
      (select count(*) from place_marks where user_id = ${userId} and visited_at is not null)::int as places_visited,
      (select count(distinct p.category_slug) from place_marks pm join places p on p.id = pm.place_id
        where pm.user_id = ${userId} and pm.visited_at is not null)::int as visited_categories,
      (select count(*) from place_marks pm join places p on p.id = pm.place_id
        where pm.user_id = ${userId} and pm.visited_at is not null and p.category_slug = 'beaches')::int as beaches_visited,
      (select coalesce(sum(amount), 0) from points_ledger where user_id = ${userId})::int as points`);
  const days = await query<{ period_key: string }>(sql`
    select distinct period_key from user_challenges
    where user_id = ${userId} and period = 'daily' and status = 'completed' order by period_key`);
  const { best } = computeStreaks(
    days.map((d) => d.period_key),
    dateKey(),
  );
  return {
    challengesDone: row?.challenges_done ?? 0,
    weeklyDone: row?.weekly_done ?? 0,
    bestStreak: best,
    bucketAdded: row?.bucket_added ?? 0,
    bucketDone: row?.bucket_done ?? 0,
    memories: row?.memories ?? 0,
    photos: row?.photos ?? 0,
    placesVisited: row?.places_visited ?? 0,
    visitedCategories: row?.visited_categories ?? 0,
    beachesVisited: row?.beaches_visited ?? 0,
    points: row?.points ?? 0,
  };
}

/** Award any newly unlocked achievements; returns the ones just earned. */
export async function evaluateAchievements(userId: string): Promise<AchievementDef[]> {
  const stats = await achievementStats(userId);
  const have = new Set(
    (await query<{ slug: string }>(sql`select slug from user_achievements where user_id = ${userId}`)).map((r) => r.slug),
  );
  const earned: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (have.has(a.slug) || stats[a.stat] < a.target) continue;
    const rows = await query(sql`
      insert into user_achievements (user_id, slug) values (${userId}, ${a.slug})
      on conflict do nothing returning slug`);
    if (rows.length) earned.push(a);
  }
  return earned;
}

export async function userAchievements(userId: string): Promise<Map<string, Date>> {
  const rows = await query<{ slug: string; earned_at: Date }>(sql`
    select slug, earned_at from user_achievements where user_id = ${userId}`);
  return new Map(rows.map((r) => [r.slug, r.earned_at]));
}
