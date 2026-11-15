import 'server-only';
import { POINTS } from '@/lib/achievements';
import { dateKey } from '@/lib/time';
import { maybeOne, query, sql, transaction } from '../db';
import { deleteImages } from '../media';
import { evaluateAchievements } from './achievements';
import { UserError } from '../errors';

export interface Memory {
  id: string;
  kind: 'moment' | 'challenge' | 'bucket' | 'visit';
  title: string;
  body: string | null;
  happened_on: string;
  place_id: string | null;
  place_name: string | null;
  place_category: string | null;
  user_challenge_id: string | null;
  bucket_item_id: string | null;
  created_at: Date;
  photo_ids: string[];
}

export async function createMemory(
  userId: string,
  m: {
    title: string;
    body: string | null;
    happenedOn: string;
    placeId?: string | null;
    placeName?: string | null;
    kind?: Memory['kind'];
    userChallengeId?: string | null;
    bucketItemId?: string | null;
    photoIds: string[];
  },
) {
  const id = await transaction(async (t) => {
    // Only link records that belong to this user.
    const [checks] = await t.query<{ uc: boolean; bi: boolean }>(sql`
      select
        (${m.userChallengeId ?? null}::uuid is null or exists (select 1 from user_challenges where id = ${m.userChallengeId ?? null}::uuid and user_id = ${userId})) as uc,
        (${m.bucketItemId ?? null}::uuid is null or exists (select 1 from bucket_items where id = ${m.bucketItemId ?? null}::uuid and user_id = ${userId})) as bi`);
    if (!checks.uc || !checks.bi) throw new UserError('That link isn’t yours.');
    const [row] = await t.query<{ id: string }>(sql`
      insert into memories (user_id, kind, title, body, happened_on, place_id, place_name, user_challenge_id, bucket_item_id)
      values (${userId}, ${m.kind ?? 'moment'}, ${m.title}, ${m.body}, ${m.happenedOn}, ${m.placeId ?? null}, ${m.placeName ?? null},
        ${m.userChallengeId ?? null}, ${m.bucketItemId ?? null})
      returning id`);
    for (const [i, mediaId] of m.photoIds.entries()) {
      await t.query(sql`
        insert into memory_photos (memory_id, media_id, sort)
        select ${row.id}, id, ${i} from media where id = ${mediaId} and user_id = ${userId}`);
    }
    // A few points for keeping a journal — capped at three memories a day.
    const [{ n }] = await t.query<{ n: number }>(sql`
      select count(*)::int as n from points_ledger
      where user_id = ${userId} and reason = 'memory' and ref like ${dateKey() + ':%'}`);
    if (n < 3) {
      await t.query(sql`insert into points_ledger (user_id, amount, reason, ref)
        values (${userId}, ${POINTS.memory}, 'memory', ${`${dateKey()}:${row.id}`}) on conflict do nothing`);
    }
    return row.id;
  });
  const earned = await evaluateAchievements(userId);
  return { id, earned };
}

const MEMORY_SELECT = sql`
  select m.*, p.category_slug as place_category,
    coalesce(array(select mp.media_id::text from memory_photos mp where mp.memory_id = m.id order by mp.sort), '{}') as photo_ids
  from memories m left join places p on p.id = m.place_id`;

export async function getMemory(userId: string, id: string): Promise<Memory | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return maybeOne<Memory & Record<string, unknown>>(sql`${MEMORY_SELECT} where m.id = ${id} and m.user_id = ${userId}`);
}

export async function deleteMemory(userId: string, id: string) {
  const photos = await query<{ media_id: string }>(sql`
    select mp.media_id from memory_photos mp join memories m on m.id = mp.memory_id where m.id = ${id} and m.user_id = ${userId}`);
  await query(sql`delete from memories where id = ${id} and user_id = ${userId}`);
  await deleteImages(photos.map((p) => p.media_id), userId);
}

export type TimelineItem =
  | { type: 'memory'; date: string; at: Date; memory: Memory }
  | { type: 'challenge'; date: string; at: Date; id: string; title: string; points: number; period: 'daily' | 'weekly'; note: string | null }
  | { type: 'visit'; date: string; at: Date; placeId: string; name: string; category: string }
  | { type: 'bucket'; date: string; at: Date; id: string; title: string };

/** Everything that happened this summer, newest first. Items already told as a memory aren't repeated. */
export async function timeline(userId: string, limit = 200): Promise<TimelineItem[]> {
  const [memories, challenges, visits, buckets] = await Promise.all([
    query<Memory & Record<string, unknown>>(sql`${MEMORY_SELECT} where m.user_id = ${userId} order by m.happened_on desc, m.created_at desc limit ${limit}`),
    query<{ id: string; title: string; points: number; period: 'daily' | 'weekly'; note: string | null; completed_at: Date }>(sql`
      select uc.id, c.title, uc.points, uc.period, uc.note, uc.completed_at
      from user_challenges uc join challenges c on c.id = uc.challenge_id
      where uc.user_id = ${userId} and uc.status = 'completed'
        and not exists (select 1 from memories m where m.user_challenge_id = uc.id)
      order by uc.completed_at desc limit ${limit}`),
    query<{ place_id: string; name: string; category_slug: string; visited_at: Date }>(sql`
      select pm.place_id, p.name, p.category_slug, pm.visited_at
      from place_marks pm join places p on p.id = pm.place_id
      where pm.user_id = ${userId} and pm.visited_at is not null
        and not exists (select 1 from memories m where m.place_id = pm.place_id and m.user_id = ${userId})
      order by pm.visited_at desc limit ${limit}`),
    query<{ id: string; title: string; completed_at: Date }>(sql`
      select b.id, b.title, b.completed_at from bucket_items b
      where b.user_id = ${userId} and b.completed_at is not null
        and not exists (select 1 from memories m where m.bucket_item_id = b.id)
      order by b.completed_at desc limit ${limit}`),
  ]);
  const items: TimelineItem[] = [
    ...memories.map((m) => ({ type: 'memory' as const, date: m.happened_on, at: new Date(`${m.happened_on}T12:00:00+02:00`), memory: m })),
    ...challenges.map((c) => ({ type: 'challenge' as const, date: dateKey(c.completed_at), at: c.completed_at, id: c.id, title: c.title, points: c.points, period: c.period, note: c.note })),
    ...visits.map((v) => ({ type: 'visit' as const, date: dateKey(v.visited_at), at: v.visited_at, placeId: v.place_id, name: v.name, category: v.category_slug })),
    ...buckets.map((b) => ({ type: 'bucket' as const, date: dateKey(b.completed_at), at: b.completed_at, id: b.id, title: b.title })),
  ];
  return items.sort((a, b) => (a.date === b.date ? b.at.getTime() - a.at.getTime() : a.date < b.date ? 1 : -1)).slice(0, limit);
}

export async function summerStats(userId: string) {
  const row = await maybeOne<Record<string, number>>(sql`
    select
      (select count(*) from memories where user_id = ${userId})::int as memories,
      (select count(*) from memory_photos mp join memories m on m.id = mp.memory_id where m.user_id = ${userId})::int as photos,
      (select count(*) from place_marks where user_id = ${userId} and visited_at is not null)::int as places,
      (select count(*) from user_challenges where user_id = ${userId} and status = 'completed')::int as challenges,
      (select coalesce(sum(amount), 0) from points_ledger where user_id = ${userId})::int as points`);
  return {
    memories: row?.memories ?? 0,
    photos: row?.photos ?? 0,
    places: row?.places ?? 0,
    challenges: row?.challenges ?? 0,
    points: row?.points ?? 0,
  };
}
