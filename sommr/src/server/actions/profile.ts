'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { CITIES, nearestCity, getCity } from '@/lib/cities';
import { INTEREST_SLUGS } from '@/lib/interests';
import { destroySession, getCurrentUser, hashPassword, requireUser, verifyPassword } from '../auth';
import { maybeOne, query, sql } from '../db';
import { reverseGeocode } from '../geocode';

const coord = z.coerce.number().refine(Number.isFinite);

const prefsSchema = z.object({
  city: z.string().refine((s) => CITIES.some((c) => c.slug === s), 'Choose a city'),
  lat: coord.optional(),
  lng: coord.optional(),
  interests: z.array(z.enum(INTEREST_SLUGS as [string, ...string[]])).min(1, 'Pick at least one thing you love').max(8),
});

function readPrefs(form: FormData) {
  const lat = form.get('lat');
  const lng = form.get('lng');
  return prefsSchema.safeParse({
    city: form.get('city'),
    lat: lat ? lat : undefined,
    lng: lng ? lng : undefined,
    interests: form.getAll('interests'),
  });
}

async function savePrefs(userId: string, p: z.infer<typeof prefsSchema>) {
  const useDevice = p.lat != null && p.lng != null && p.lat < -21 && p.lat > -35.5 && p.lng > 16 && p.lng < 33.5;
  await query(sql`
    update users set city_slug = ${p.city}, interests = ${p.interests},
      location_mode = ${useDevice ? 'device' : 'city'},
      home_lat = ${useDevice ? Math.round(p.lat! * 1000) / 1000 : null},
      home_lng = ${useDevice ? Math.round(p.lng! * 1000) / 1000 : null},
      onboarded_at = coalesce(onboarded_at, now()), updated_at = now()
    where id = ${userId}`);
}

export interface PrefsState {
  error?: string;
  ok?: boolean;
}

export async function completeOnboarding(_: PrefsState, form: FormData): Promise<PrefsState> {
  const user = await requireUser({ allowUnonboarded: true });
  const parsed = readPrefs(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Please check your choices.' };
  await savePrefs(user.id, parsed.data);
  redirect('/?welcome=1');
}

export async function updatePreferences(_: PrefsState, form: FormData): Promise<PrefsState> {
  const user = await requireUser();
  const parsed = readPrefs(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Please check your choices.' };
  await savePrefs(user.id, parsed.data);
  const name = String(form.get('name') ?? '').trim().slice(0, 60);
  if (name) await query(sql`update users set display_name = ${name} where id = ${user.id}`);
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Turn browser coordinates into the nearest SOMMR city and a friendly area name. */
export async function locate(lat: number, lng: number): Promise<{ city: string; cityName: string; area: string | null; km: number } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Please sign in again.' };
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: 'We couldn’t read your location.' };
  const { city, km } = nearestCity(lat, lng);
  if (km > 250) return { error: 'SOMMR covers South Africa — it looks like you’re outside the country. Pick a city instead.' };
  const area = await reverseGeocode(lat, lng).catch(() => null);
  return { city: city.slug, cityName: city.name, area, km: Math.round(km) };
}

export interface PasswordState {
  error?: string;
  ok?: boolean;
}

export async function changePassword(_: PasswordState, form: FormData): Promise<PasswordState> {
  const user = await requireUser();
  const current = String(form.get('current') ?? '');
  const next = String(form.get('password') ?? '');
  if (next.length < 10) return { error: 'Use at least 10 characters for the new password.' };
  const row = await maybeOne<{ password_hash: string }>(sql`select password_hash from users where id = ${user.id}`);
  if (!row || !(await verifyPassword(current, row.password_hash))) return { error: 'Your current password isn’t right.' };
  await query(sql`update users set password_hash = ${await hashPassword(next)}, updated_at = now() where id = ${user.id}`);
  return { ok: true };
}

export async function deleteAccount(_: PasswordState, form: FormData): Promise<PasswordState> {
  const user = await requireUser({ allowUnonboarded: true });
  if (String(form.get('confirm') ?? '').trim().toUpperCase() !== 'DELETE') return { error: 'Type DELETE to confirm.' };
  // Everything the user owns cascades with the account, photos included.
  await query(sql`delete from users where id = ${user.id}`);
  await destroySession();
  redirect('/');
}

export async function cityName(slug: string | null) {
  return getCity(slug)?.name ?? null;
}
