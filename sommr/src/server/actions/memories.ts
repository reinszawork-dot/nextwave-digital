'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { dateKey } from '@/lib/time';
import { requireUser } from '../auth';
import { maybeOne, sql } from '../db';
import { deleteImages, saveImage, UploadError } from '../media';
import { createMemory, deleteMemory } from '../services/memories';
import { UserError } from '../errors';

export interface MemoryFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

const schema = z.object({
  title: z.string().trim().min(2, 'Give this memory a title').max(120),
  body: z.string().trim().max(4000).optional(),
  happenedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
  placeName: z.string().trim().max(160).optional(),
  placeId: z.uuid().optional().or(z.literal('')),
  challengeId: z.uuid().optional().or(z.literal('')),
  bucketId: z.uuid().optional().or(z.literal('')),
});

export async function createMemoryAction(_: MemoryFormState, form: FormData): Promise<MemoryFormState> {
  const user = await requireUser();
  const parsed = schema.safeParse({
    title: form.get('title'),
    body: form.get('body') ?? undefined,
    happenedOn: form.get('happenedOn'),
    placeName: form.get('placeName') ?? undefined,
    placeId: form.get('placeId') ?? undefined,
    challengeId: form.get('challengeId') ?? undefined,
    bucketId: form.get('bucketId') ?? undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { fieldErrors };
  }
  const d = parsed.data;
  if (d.happenedOn > dateKey()) return { fieldErrors: { happenedOn: 'Memories can’t be in the future.' } };

  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0).slice(0, 6);
  const photoIds: string[] = [];
  try {
    for (const f of files) photoIds.push(await saveImage(user.id, f));
  } catch (err) {
    await deleteImages(photoIds, user.id);
    return { error: err instanceof UploadError ? err.message : 'We couldn’t save your photos. Please try again.' };
  }

  let placeName = d.placeName || null;
  let placeId = d.placeId || null;
  if (placeId) {
    const p = await maybeOne<{ name: string }>(sql`select name from places where id = ${placeId}`);
    if (!p) placeId = null;
    else placeName ??= p.name;
  }
  const kind = d.challengeId ? 'challenge' : d.bucketId ? 'bucket' : placeId ? 'visit' : 'moment';
  let created: { id: string };
  try {
    created = await createMemory(user.id, {
    title: d.title,
    body: d.body || null,
    happenedOn: d.happenedOn,
    placeId,
    placeName,
    kind,
    userChallengeId: d.challengeId || null,
    bucketItemId: d.bucketId || null,
    photoIds,
  });
  } catch (err) {
    await deleteImages(photoIds, user.id);
    if (err instanceof UserError) return { error: err.message };
    console.error('[memory]', err);
    return { error: 'We couldn’t save that memory. Please try again.' };
  }
  revalidatePath('/', 'layout');
  redirect(`/my-summer/memories/${created.id}?new=1`);
}

export async function deleteMemoryAction(id: string): Promise<void> {
  const user = await requireUser();
  await deleteMemory(user.id, z.uuid().parse(id));
  revalidatePath('/', 'layout');
  redirect('/my-summer');
}
