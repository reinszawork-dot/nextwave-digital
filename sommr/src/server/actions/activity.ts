'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { BUCKET_SUGGESTIONS } from '@/lib/bucket-suggestions';
import { POINTS } from '@/lib/achievements';
import { requireUser } from '../auth';
import { UserError } from '../errors';
import { query, sql } from '../db';
import { setEventSaved } from '../events/service';
import { markPlace } from '../places/service';
import { evaluateAchievements } from '../services/achievements';
import { addBucketItem, deleteBucketItem, setBucketDone, updateBucketItem } from '../services/bucket';
import { completeChallenge, swapChallenge, uncompleteChallenge } from '../services/challenges';

type Earned = { slug: string; title: string }[];
export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const uuid = z.uuid();

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof UserError) return { ok: false, error: err.message };
  if (err instanceof z.ZodError) return { ok: false, error: 'That request wasn’t valid.' };
  // Next.js uses thrown errors for redirects (e.g. an expired session) — let those through.
  if (err instanceof Error && 'digest' in err && String((err as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) throw err;
  console.error('[action]', err);
  return { ok: false, error: 'Something went wrong. Please try again.' };
}

function refresh() {
  revalidatePath('/', 'layout');
}

// ───────────── Challenges ─────────────

export async function completeChallengeAction(assignmentId: string, note?: string): Promise<ActionResult<{ points: number; earned: Earned }>> {
  try {
    const user = await requireUser();
    const id = uuid.parse(assignmentId);
    const clean = note?.trim().slice(0, 500) || null;
    const r = await completeChallenge(user, id, clean);
    refresh();
    return { ok: true, points: r.points, earned: r.earned.map((a) => ({ slug: a.slug, title: a.title })) };
  } catch (err) {
    return fail(err);
  }
}

export async function undoChallengeAction(assignmentId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await uncompleteChallenge(user, uuid.parse(assignmentId));
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function swapChallengeAction(period: 'daily' | 'weekly'): Promise<ActionResult<{ title: string | null }>> {
  try {
    const user = await requireUser();
    const next = await swapChallenge(user, period === 'weekly' ? 'weekly' : 'daily');
    refresh();
    return { ok: true, title: next?.challenge.title ?? null };
  } catch (err) {
    return fail(err);
  }
}

// ───────────── Bucket list ─────────────

const bucketSchema = z.object({
  title: z.string().trim().min(2, 'Give it a name').max(140),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export async function addBucketAction(input: { title: string; notes?: string | null; suggestion?: string | null; placeId?: string | null; eventId?: string | null }): Promise<ActionResult<{ duplicate: boolean; earned: Earned }>> {
  try {
    const user = await requireUser();
    const suggestion = input.suggestion ? BUCKET_SUGGESTIONS.find((s) => s.slug === input.suggestion) : null;
    const parsed = bucketSchema.parse({ title: suggestion?.title ?? input.title, notes: input.notes });
    const r = await addBucketItem(user.id, {
      title: parsed.title,
      notes: parsed.notes ?? null,
      suggestionSlug: suggestion?.slug ?? null,
      interest: suggestion?.interest ?? null,
      placeId: input.placeId ? uuid.parse(input.placeId) : null,
      eventId: input.eventId ? uuid.parse(input.eventId) : null,
    });
    refresh();
    return { ok: true, duplicate: r.duplicate, earned: r.earned.map((a) => ({ slug: a.slug, title: a.title })) };
  } catch (err) {
    if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? 'Check the details.' };
    return fail(err);
  }
}

export async function toggleBucketAction(id: string, done: boolean): Promise<ActionResult<{ points: number; earned: Earned }>> {
  try {
    const user = await requireUser();
    const earned = await setBucketDone(user.id, uuid.parse(id), done);
    refresh();
    return { ok: true, points: done ? POINTS.bucketDone : 0, earned: earned.map((a) => ({ slug: a.slug, title: a.title })) };
  } catch (err) {
    return fail(err);
  }
}

export async function updateBucketAction(id: string, title: string, notes: string | null): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = bucketSchema.parse({ title, notes });
    await updateBucketItem(user.id, uuid.parse(id), parsed.title, parsed.notes ?? null);
    refresh();
    return { ok: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? 'Check the details.' };
    return fail(err);
  }
}

export async function deleteBucketAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await deleteBucketItem(user.id, uuid.parse(id));
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ───────────── Places & events ─────────────

export async function markPlaceAction(placeId: string, field: 'saved' | 'visited', on: boolean): Promise<ActionResult<{ earned: Earned; points: number }>> {
  try {
    const user = await requireUser();
    const id = uuid.parse(placeId);
    await markPlace(user.id, id, field === 'visited' ? 'visited' : 'saved', on);
    let points = 0;
    let earned: Earned = [];
    if (field === 'visited') {
      if (on) {
        const rows = await query(sql`insert into points_ledger (user_id, amount, reason, ref)
          values (${user.id}, ${POINTS.visit}, 'visit', ${id}) on conflict do nothing returning id`);
        points = rows.length ? POINTS.visit : 0;
        earned = (await evaluateAchievements(user.id)).map((a) => ({ slug: a.slug, title: a.title }));
      } else {
        await query(sql`delete from points_ledger where user_id = ${user.id} and reason = 'visit' and ref = ${id}`);
      }
    }
    refresh();
    return { ok: true, earned, points };
  } catch (err) {
    return fail(err);
  }
}

export async function saveEventAction(eventId: string, saved: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await setEventSaved(user.id, uuid.parse(eventId), saved);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
