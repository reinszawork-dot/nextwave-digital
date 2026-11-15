import 'server-only';
import { POINTS } from '@/lib/achievements';
import { maybeOne, query, sql, transaction } from '../db';
import { evaluateAchievements } from './achievements';
import { UserError } from '../errors';

export interface BucketItem {
  id: string;
  title: string;
  notes: string | null;
  suggestion_slug: string | null;
  interest: string | null;
  place_id: string | null;
  place_name: string | null;
  event_id: string | null;
  event_title: string | null;
  completed_at: Date | null;
  created_at: Date;
  memory_id: string | null;
  photo_id: string | null;
}

export async function listBucket(userId: string): Promise<BucketItem[]> {
  return query<BucketItem & Record<string, unknown>>(sql`
    select b.*, p.name as place_name, e.title as event_title,
      (select m.id from memories m where m.bucket_item_id = b.id order by m.created_at desc limit 1) as memory_id,
      (select mp.media_id from memories m join memory_photos mp on mp.memory_id = m.id
        where m.bucket_item_id = b.id order by m.created_at desc, mp.sort limit 1) as photo_id
    from bucket_items b
    left join places p on p.id = b.place_id
    left join events e on e.id = b.event_id
    where b.user_id = ${userId}
    order by (b.completed_at is not null), b.completed_at desc nulls last, b.sort, b.created_at desc`);
}

export async function bucketProgress(userId: string): Promise<{ done: number; total: number }> {
  const row = await maybeOne<{ done: number; total: number }>(sql`
    select count(*) filter (where completed_at is not null)::int as done, count(*)::int as total
    from bucket_items where user_id = ${userId}`);
  return row ?? { done: 0, total: 0 };
}

export async function addBucketItem(
  userId: string,
  item: { title: string; notes?: string | null; suggestionSlug?: string | null; interest?: string | null; placeId?: string | null; eventId?: string | null },
) {
  const count = await maybeOne<{ n: number }>(sql`select count(*)::int as n from bucket_items where user_id = ${userId}`);
  if ((count?.n ?? 0) >= 200) throw new UserError('Your bucket list is full (200 items). Tick some off first!');
  const row = await maybeOne<{ id: string }>(sql`
    insert into bucket_items (user_id, title, notes, suggestion_slug, interest, place_id, event_id, sort)
    values (${userId}, ${item.title}, ${item.notes ?? null}, ${item.suggestionSlug ?? null}, ${item.interest ?? null},
      ${item.placeId ?? null}, ${item.eventId ?? null}, 0)
    on conflict do nothing
    returning id`);
  const earned = row ? await evaluateAchievements(userId) : [];
  return { id: row?.id ?? null, duplicate: !row, earned };
}

export async function setBucketDone(userId: string, id: string, done: boolean) {
  await transaction(async (t) => {
    const [row] = await t.query<{ id: string }>(sql`
      update bucket_items set completed_at = ${done ? sql`coalesce(completed_at, now())` : sql`null`}
      where id = ${id} and user_id = ${userId} returning id`);
    if (!row) throw new UserError('That item no longer exists.');
    if (done) {
      await t.query(sql`insert into points_ledger (user_id, amount, reason, ref)
        values (${userId}, ${POINTS.bucketDone}, 'bucket', ${id}) on conflict do nothing`);
    } else {
      await t.query(sql`delete from points_ledger where user_id = ${userId} and reason = 'bucket' and ref = ${id}`);
    }
  });
  return done ? evaluateAchievements(userId) : [];
}

export async function updateBucketItem(userId: string, id: string, title: string, notes: string | null) {
  await query(sql`update bucket_items set title = ${title}, notes = ${notes} where id = ${id} and user_id = ${userId}`);
}

export async function deleteBucketItem(userId: string, id: string) {
  await transaction(async (t) => {
    await t.query(sql`delete from points_ledger where user_id = ${userId} and reason = 'bucket' and ref = ${id}`);
    await t.query(sql`delete from bucket_items where id = ${id} and user_id = ${userId}`);
  });
}
