'use server';

import { z } from 'zod';
import { CITIES, getCity } from '@/lib/cities';
import { parseSaDateTime } from '@/lib/time';
import { rateLimit, requireUser } from '../auth';
import { maybeOne, query, sql } from '../db';

export interface SubmitState {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
}

const url = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Use a full link starting with https://');

function errs(e: z.ZodError): SubmitState {
  const fieldErrors: Record<string, string> = {};
  for (const i of e.issues) fieldErrors[String(i.path[0])] ??= i.message;
  return { fieldErrors };
}

const eventSchema = z.object({
  title: z.string().trim().min(3, 'Add the event name').max(200),
  starts_at: z.string().min(1, 'When does it start?'),
  venue_name: z.string().trim().min(2, 'Where is it?').max(200),
  city_slug: z.string().refine((s) => CITIES.some((c) => c.slug === s), 'Choose a city'),
  category_slug: z.string().min(1, 'Choose a type'),
  link: url.refine((v) => v !== '', 'Add a link to the official listing so we can check it'),
  description: z.string().trim().max(2000),
});

export async function submitEventAction(_: SubmitState, form: FormData): Promise<SubmitState> {
  const user = await requireUser();
  const parsed = eventSchema.safeParse(Object.fromEntries(['title', 'starts_at', 'venue_name', 'city_slug', 'category_slug', 'link', 'description'].map((k) => [k, String(form.get(k) ?? '')])));
  if (!parsed.success) return errs(parsed.error);
  const v = parsed.data;
  const startsAt = parseSaDateTime(v.starts_at);
  if (!startsAt || startsAt < new Date()) return { fieldErrors: { starts_at: 'Choose a date and time in the future' } };
  if (!(await maybeOne(sql`select 1 from categories where slug = ${v.category_slug} and kind = 'event'`))) return { fieldErrors: { category_slug: 'Choose a type' } };
  if (!(await rateLimit(`submit:${user.id}`, 10, 86_400))) return { error: 'You’ve made a lot of suggestions today — thank you! Try again tomorrow.' };
  const city = getCity(v.city_slug)!;
  await query(sql`
    insert into events (source, title, description, category_slug, starts_at, venue_name, city_slug, ticket_url, source_url, status, submitted_by)
    values ('community', ${v.title}, ${v.description || null}, ${v.category_slug}, ${startsAt}, ${v.venue_name}, ${city.slug}, ${v.link}, ${v.link}, 'pending', ${user.id})`);
  return { ok: true };
}

const placeSchema = z.object({
  name: z.string().trim().min(2, 'Add the name').max(200),
  category_slug: z.string().min(1, 'Choose a category'),
  address: z.string().trim().min(5, 'Add an address or landmark so we can find it').max(300),
  city_slug: z.string().refine((s) => CITIES.some((c) => c.slug === s), 'Choose the nearest town'),
  website: url,
  description: z.string().trim().max(1000),
});

export async function submitPlaceAction(_: SubmitState, form: FormData): Promise<SubmitState> {
  const user = await requireUser();
  const parsed = placeSchema.safeParse(Object.fromEntries(['name', 'category_slug', 'address', 'city_slug', 'website', 'description'].map((k) => [k, String(form.get(k) ?? '')])));
  if (!parsed.success) return errs(parsed.error);
  const v = parsed.data;
  if (!(await maybeOne(sql`select 1 from categories where slug = ${v.category_slug} and kind = 'place'`))) return { fieldErrors: { category_slug: 'Choose a category' } };
  if (!(await rateLimit(`submit:${user.id}`, 10, 86_400))) return { error: 'You’ve made a lot of suggestions today — thank you! Try again tomorrow.' };
  const city = getCity(v.city_slug)!;
  // Rough position (town centre) until an admin confirms the exact spot.
  await query(sql`
    insert into places (source, name, category_slug, lat, lng, address, city, website, description, status, submitted_by)
    values ('community', ${v.name}, ${v.category_slug}, ${city.lat}, ${city.lng}, ${v.address}, ${city.name}, ${v.website || null}, ${v.description || null}, 'pending', ${user.id})`);
  return { ok: true };
}
