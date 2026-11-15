'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { CITIES } from '@/lib/cities';
import { ICON_NAMES } from '@/components/ui/Icon';
import { parseSaDateTime, toSaLocalInput } from '@/lib/time';
import { requireAdmin } from '../auth';
import { maybeOne, query, sql } from '../db';
import { assignCity, runAllImports, runSource, type EventSource, LOCKABLE_FIELDS } from '../events/importer';
import { parseJsonLdEvents } from '../events/providers/jsonld';
import { geocodeOne } from '../geocode';
import { parseFilter } from '../places/osm';
import { safeFetchText, UnsafeUrlError } from '../safe-fetch';

export interface AdminFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  message?: string;
}

function issues(err: z.ZodError): AdminFormState {
  const fieldErrors: Record<string, string> = {};
  for (const i of err.issues) fieldErrors[String(i.path[0])] ??= i.message;
  return { fieldErrors, error: 'Please fix the highlighted fields.' };
}

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();
const optUrl = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .refine((v) => !v || /^https?:\/\/\S+$/i.test(v), 'Use a full http(s) link');
const optNum = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : Number(v)))
    .nullable()
    .optional()
    .refine((v) => v == null || (Number.isFinite(v) && v >= min && v <= max), `Must be between ${min} and ${max}`);

const get = (form: FormData, k: string) => {
  const v = form.get(k);
  return typeof v === 'string' ? v : undefined;
};

// ───────────────────────────── Events ─────────────────────────────

const eventSchema = z
  .object({
    title: z.string().trim().min(3, 'Add a title').max(200),
    description: optText(5000),
    category_slug: z.string().min(1, 'Choose a category'),
    starts_at: z.string().min(1, 'Choose a start time'),
    ends_at: optText(40),
    all_day: z.boolean(),
    venue_name: optText(200),
    address: optText(300),
    city_slug: z.string().refine((s) => s === '' || CITIES.some((c) => c.slug === s), 'Unknown city'),
    lat: optNum(-35.5, -21),
    lng: optNum(16, 33.5),
    price_min: optNum(0, 100000),
    price_max: optNum(0, 100000),
    is_free: z.boolean(),
    ticket_url: optUrl,
    image_url: optUrl,
    organiser: optText(200),
    status: z.enum(['published', 'pending', 'rejected', 'cancelled', 'archived']),
    featured: z.boolean(),
    featured_note: optText(300),
    unlock: z.boolean(),
  })
  .refine((v) => (v.lat == null) === (v.lng == null), { message: 'Give both latitude and longitude, or neither', path: ['lat'] });

function readEvent(form: FormData) {
  return eventSchema.safeParse({
    title: get(form, 'title'),
    description: get(form, 'description') ?? '',
    category_slug: get(form, 'category_slug'),
    starts_at: get(form, 'starts_at'),
    ends_at: get(form, 'ends_at') ?? '',
    all_day: form.get('all_day') === 'on',
    venue_name: get(form, 'venue_name') ?? '',
    address: get(form, 'address') ?? '',
    city_slug: get(form, 'city_slug') ?? '',
    lat: get(form, 'lat') ?? '',
    lng: get(form, 'lng') ?? '',
    price_min: get(form, 'price_min') ?? '',
    price_max: get(form, 'price_max') ?? '',
    is_free: form.get('is_free') === 'on',
    ticket_url: get(form, 'ticket_url') ?? '',
    image_url: get(form, 'image_url') ?? '',
    organiser: get(form, 'organiser') ?? '',
    status: get(form, 'status') ?? 'published',
    featured: form.get('featured') === 'on',
    featured_note: get(form, 'featured_note') ?? '',
    unlock: form.get('unlock') === 'on',
  });
}

export async function saveEventAction(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const id = get(form, 'id') || null;
  const parsed = readEvent(form);
  if (!parsed.success) return issues(parsed.error);
  const v = parsed.data;
  const startsAt = parseSaDateTime(v.starts_at);
  const endsAt = v.ends_at ? parseSaDateTime(v.ends_at) : null;
  if (!startsAt) return { fieldErrors: { starts_at: 'Invalid date' }, error: 'Please fix the highlighted fields.' };
  if (endsAt && endsAt <= startsAt) return { fieldErrors: { ends_at: 'Must be after the start' }, error: 'Please fix the highlighted fields.' };
  const cat = await maybeOne(sql`select 1 from categories where slug = ${v.category_slug} and kind = 'event'`);
  if (!cat) return { fieldErrors: { category_slug: 'Choose a category' }, error: 'Please fix the highlighted fields.' };
  const city = v.city_slug || (v.lat != null && v.lng != null ? assignCity({ lat: v.lat, lng: v.lng }, null) : null);
  const values: Record<string, unknown> = {
    title: v.title,
    description: v.description ?? null,
    category_slug: v.category_slug,
    starts_at: startsAt,
    ends_at: endsAt,
    venue_name: v.venue_name ?? null,
    address: v.address ?? null,
    city_slug: city,
    lat: v.lat ?? null,
    lng: v.lng ?? null,
    price_min: v.is_free ? 0 : (v.price_min ?? null),
    price_max: v.is_free ? 0 : (v.price_max ?? v.price_min ?? null),
    is_free: v.is_free,
    ticket_url: v.ticket_url ?? null,
    image_url: v.image_url ?? null,
    organiser: v.organiser ?? null,
  };

  if (!id) {
    const row = await maybeOne<{ id: string }>(sql`
      insert into events (source, title, description, category_slug, starts_at, ends_at, all_day, venue_name, address, city_slug, lat, lng,
        price_min, price_max, is_free, ticket_url, image_url, organiser, status, featured, featured_note)
      values ('admin', ${values.title}, ${values.description}, ${values.category_slug}, ${startsAt}, ${endsAt}, ${v.all_day},
        ${values.venue_name}, ${values.address}, ${city}, ${values.lat}, ${values.lng}, ${values.price_min}, ${values.price_max},
        ${v.is_free}, ${values.ticket_url}, ${values.image_url}, ${values.organiser}, ${v.status}, ${v.featured}, ${v.featured_note ?? null})
      returning id`);
    revalidatePath('/', 'layout');
    redirect(`/admin/events/${row!.id}?saved=1`);
  }

  const existing = await maybeOne<Record<string, unknown> & { source: string; locked_fields: string[] }>(sql`select * from events where id = ${id}`);
  if (!existing) return { error: 'This event no longer exists.' };
  // For imported events, remember which fields the admin corrected so imports don't undo them.
  let locked = new Set(existing.locked_fields);
  if (!['admin', 'community'].includes(existing.source)) {
    if (v.unlock) locked = new Set();
    for (const f of LOCKABLE_FIELDS) {
      const before = existing[f];
      const after = values[f];
      const same =
        before instanceof Date && after instanceof Date
          ? before.getTime() === after.getTime()
          : (before ?? null) === (after ?? null) || String(before ?? '') === String(after ?? '');
      if (!same) locked.add(f);
    }
  }
  await query(sql`
    update events set title = ${values.title}, description = ${values.description}, category_slug = ${values.category_slug},
      starts_at = ${startsAt}, ends_at = ${endsAt}, all_day = ${v.all_day}, venue_name = ${values.venue_name}, address = ${values.address},
      city_slug = ${city}, lat = ${values.lat}, lng = ${values.lng}, price_min = ${values.price_min}, price_max = ${values.price_max},
      is_free = ${v.is_free}, ticket_url = ${values.ticket_url}, image_url = ${values.image_url}, organiser = ${values.organiser},
      status = ${v.status}, featured = ${v.featured}, featured_note = ${v.featured_note ?? null}, locked_fields = ${[...locked]},
      updated_at = now()
    where id = ${id}`);
  revalidatePath('/', 'layout');
  return { ok: true, message: locked.size && !['admin', 'community'].includes(existing.source) ? `Saved. ${locked.size} corrected field(s) are protected from future imports.` : 'Saved.' };
}

export async function deleteEventAction(id: string) {
  await requireAdmin();
  const row = await maybeOne<{ source: string }>(sql`select source from events where id = ${id}`);
  if (row && ['admin', 'community'].includes(row.source)) await query(sql`delete from events where id = ${id}`);
  // Imported events would come back on the next import, so they're rejected (hidden) instead.
  else await query(sql`update events set status = 'rejected', updated_at = now() where id = ${id}`);
  revalidatePath('/', 'layout');
  redirect('/admin/events');
}

export async function setEventStatusAction(id: string, status: 'published' | 'rejected', note?: string) {
  await requireAdmin();
  await query(sql`update events set status = ${status}, review_note = ${note ?? null}, updated_at = now() where id = ${id}`);
  revalidatePath('/', 'layout');
}

/** Read schema.org event data from a page so the admin form can be pre-filled. */
export async function fetchEventFromUrlAction(url: string): Promise<{ error?: string; message?: string; event?: Record<string, string | boolean> }> {
  await requireAdmin();
  try {
    const { text, finalUrl } = await safeFetchText(url);
    const events = parseJsonLdEvents(text, finalUrl);
    if (!events.length) return { error: 'No schema.org event data found on that page. Enter the details by hand.' };
    const e = events[0];
    return {
      message: events.length > 1 ? `Found ${events.length} events — showing the first. To import them all, add the page as a source.` : 'Details filled in from the page. Check them before saving.',
      event: {
        title: e.title,
        description: e.description ?? '',
        starts_at: toSaLocalInput(e.startsAt),
        ends_at: toSaLocalInput(e.endsAt),
        all_day: !!e.allDay,
        venue_name: e.venueName ?? '',
        address: e.address ?? '',
        lat: e.lat != null ? String(e.lat) : '',
        lng: e.lng != null ? String(e.lng) : '',
        price_min: e.priceMin != null ? String(e.priceMin) : '',
        price_max: e.priceMax != null ? String(e.priceMax) : '',
        is_free: !!e.isFree,
        ticket_url: e.ticketUrl ?? '',
        image_url: e.imageUrl ?? '',
        organiser: e.organiser ?? '',
        city_slug: (e.lat != null && e.lng != null ? assignCity({ lat: e.lat, lng: e.lng }, null) : assignCity({ cityHint: e.cityHint, address: e.address }, null)) ?? '',
      },
    };
  } catch (err) {
    return { error: err instanceof UnsafeUrlError ? err.message : `Couldn’t read that page: ${(err as Error).message}` };
  }
}

export async function geocodeAction(text: string): Promise<{ lat?: number; lng?: number; error?: string }> {
  await requireAdmin();
  if (text.trim().length < 3) return { error: 'Enter a venue or address first.' };
  try {
    const hit = await geocodeOne(text);
    return hit ?? { error: 'No match found. Try adding the suburb or city.' };
  } catch {
    return { error: 'The geocoder isn’t available right now.' };
  }
}

// ───────────────────────────── Sources & imports ─────────────────────────────

const sourceSchema = z.object({
  kind: z.enum(['ical', 'jsonld']),
  name: z.string().trim().min(2).max(120),
  url: z.string().trim().url('Enter the feed or page URL').refine((u) => /^https?:/i.test(u), 'Use http(s)'),
  city_slug: z.string().refine((s) => s === '' || CITIES.some((c) => c.slug === s)),
  default_category: z.string().optional(),
});

export async function addSourceAction(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = sourceSchema.safeParse({
    kind: get(form, 'kind'),
    name: get(form, 'name'),
    url: get(form, 'url'),
    city_slug: get(form, 'city_slug') ?? '',
    default_category: get(form, 'default_category') || undefined,
  });
  if (!parsed.success) return issues(parsed.error);
  const s = parsed.data;
  const row = await maybeOne<EventSource & Record<string, unknown>>(sql`
    insert into event_sources (kind, name, url, city_slug, default_category)
    values (${s.kind}, ${s.name}, ${s.url}, ${s.city_slug || null}, ${s.default_category ?? null}) returning *`);
  const result = await runSource(row!, 'admin');
  revalidatePath('/admin', 'layout');
  return { ok: result.status === 'ok', message: `Source added. First import: ${result.message}`, error: result.status === 'ok' ? undefined : `Source added, but the first import failed: ${result.message}` };
}

export async function toggleSourceAction(id: string, enabled: boolean) {
  await requireAdmin();
  await query(sql`update event_sources set enabled = ${enabled} where id = ${id}`);
  revalidatePath('/admin', 'layout');
}

export async function deleteSourceAction(id: string) {
  await requireAdmin();
  await query(sql`delete from event_sources where id = ${id} and kind in ('ical', 'jsonld')`);
  revalidatePath('/admin', 'layout');
}

export async function runSourceAction(id: string): Promise<{ status: string; message: string }> {
  await requireAdmin();
  const s = await maybeOne<EventSource & Record<string, unknown>>(sql`select * from event_sources where id = ${id}`);
  if (!s) return { status: 'error', message: 'Source not found' };
  const r = await runSource(s, 'admin');
  revalidatePath('/', 'layout');
  return { status: r.status, message: r.message };
}

export async function runAllImportsAction(): Promise<{ message: string }> {
  await requireAdmin();
  const r = await runAllImports('admin');
  revalidatePath('/', 'layout');
  const ok = r.results.filter((x) => x.status === 'ok').length;
  return { message: `${ok} of ${r.results.length} sources imported · ${r.archived} finished events archived · ${r.geocoded} venues located` };
}

// ───────────────────────────── Places ─────────────────────────────

const placeSchema = z.object({
  name: z.string().trim().min(2, 'Add a name').max(200),
  category_slug: z.string().min(1, 'Choose a category'),
  lat: z.coerce.number().min(-35.5, 'Must be in South Africa').max(-21, 'Must be in South Africa'),
  lng: z.coerce.number().min(16, 'Must be in South Africa').max(33.5, 'Must be in South Africa'),
  address: optText(300),
  suburb: optText(120),
  city: optText(120),
  description: optText(2000),
  website: optUrl,
  phone: optText(40),
  opening_hours: optText(300),
  status: z.enum(['published', 'pending', 'rejected', 'hidden']),
  featured: z.boolean(),
  featured_note: optText(300),
});

export async function savePlaceAction(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const id = get(form, 'id') || null;
  const parsed = placeSchema.safeParse({
    name: get(form, 'name'),
    category_slug: get(form, 'category_slug'),
    lat: get(form, 'lat'),
    lng: get(form, 'lng'),
    address: get(form, 'address') ?? '',
    suburb: get(form, 'suburb') ?? '',
    city: get(form, 'city') ?? '',
    description: get(form, 'description') ?? '',
    website: get(form, 'website') ?? '',
    phone: get(form, 'phone') ?? '',
    opening_hours: get(form, 'opening_hours') ?? '',
    status: get(form, 'status') ?? 'published',
    featured: form.get('featured') === 'on',
    featured_note: get(form, 'featured_note') ?? '',
  });
  if (!parsed.success) return issues(parsed.error);
  const v = parsed.data;
  if (!id) {
    const row = await maybeOne<{ id: string }>(sql`
      insert into places (source, name, category_slug, lat, lng, address, suburb, city, description, website, phone, opening_hours, status, featured, featured_note)
      values ('admin', ${v.name}, ${v.category_slug}, ${v.lat}, ${v.lng}, ${v.address ?? null}, ${v.suburb ?? null}, ${v.city ?? null},
        ${v.description ?? null}, ${v.website ?? null}, ${v.phone ?? null}, ${v.opening_hours ?? null}, ${v.status}, ${v.featured}, ${v.featured_note ?? null})
      returning id`);
    revalidatePath('/', 'layout');
    redirect(`/admin/places/${row!.id}?saved=1`);
  }
  const existing = await maybeOne<Record<string, unknown> & { source: string; locked_fields: string[] }>(sql`select * from places where id = ${id}`);
  if (!existing) return { error: 'This place no longer exists.' };
  const locked = new Set(existing.locked_fields);
  if (existing.source === 'osm') {
    for (const f of ['name', 'lat', 'lng', 'address', 'suburb', 'city', 'website', 'phone', 'opening_hours'] as const) {
      if (String(existing[f] ?? '') !== String((v as Record<string, unknown>)[f] ?? '')) locked.add(f);
    }
  }
  await query(sql`
    update places set name = ${v.name}, category_slug = ${v.category_slug}, lat = ${v.lat}, lng = ${v.lng}, address = ${v.address ?? null},
      suburb = ${v.suburb ?? null}, city = ${v.city ?? null}, description = ${v.description ?? null}, website = ${v.website ?? null},
      phone = ${v.phone ?? null}, opening_hours = ${v.opening_hours ?? null}, status = ${v.status}, featured = ${v.featured},
      featured_note = ${v.featured_note ?? null}, locked_fields = ${[...locked]}, updated_at = now()
    where id = ${id}`);
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Saved.' };
}

export async function setPlaceStatusAction(id: string, status: 'published' | 'rejected' | 'hidden', note?: string) {
  await requireAdmin();
  await query(sql`update places set status = ${status}, review_note = ${note ?? null}, updated_at = now() where id = ${id}`);
  revalidatePath('/', 'layout');
}

export async function toggleFeaturedAction(kind: 'event' | 'place' | 'challenge', id: string, featured: boolean) {
  await requireAdmin();
  const table = sql.raw(kind === 'event' ? 'events' : kind === 'place' ? 'places' : 'challenges');
  await query(sql`update ${table} set featured = ${featured} where id = ${id}`);
  revalidatePath('/', 'layout');
}

// ───────────────────────────── Challenges ─────────────────────────────

const challengeSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]{3,60}$/, 'Lowercase letters, numbers and dashes'),
  kind: z.enum(['daily', 'weekly']),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(5).max(500),
  tip: optText(300),
  interests: z.array(z.string()).max(8),
  cost: z.enum(['free', 'low', 'medium']),
  points: z.coerce.number().int().min(1).max(500),
  place_category: optText(60),
  coastal_only: z.boolean(),
  months: z.array(z.coerce.number().int().min(1).max(12)),
  active: z.boolean(),
  featured: z.boolean(),
});

export async function saveChallengeAction(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const id = get(form, 'id') || null;
  const parsed = challengeSchema.safeParse({
    slug: get(form, 'slug'),
    kind: get(form, 'kind'),
    title: get(form, 'title'),
    description: get(form, 'description'),
    tip: get(form, 'tip') ?? '',
    interests: form.getAll('interests').map(String),
    cost: get(form, 'cost'),
    points: get(form, 'points'),
    place_category: get(form, 'place_category') ?? '',
    coastal_only: form.get('coastal_only') === 'on',
    months: form.getAll('months').map(String),
    active: form.get('active') === 'on',
    featured: form.get('featured') === 'on',
  });
  if (!parsed.success) return issues(parsed.error);
  const v = parsed.data;
  try {
    if (!id) {
      const row = await maybeOne<{ id: string }>(sql`
        insert into challenges (slug, kind, title, description, tip, interests, cost, points, place_category, coastal_only, months, active, featured)
        values (${v.slug}, ${v.kind}, ${v.title}, ${v.description}, ${v.tip ?? null}, ${v.interests}, ${v.cost}, ${v.points},
          ${v.place_category ?? null}, ${v.coastal_only}, ${v.months}, ${v.active}, ${v.featured}) returning id`);
      revalidatePath('/admin/challenges');
      redirect(`/admin/challenges/${row!.id}?saved=1`);
    }
    await query(sql`
      update challenges set slug = ${v.slug}, kind = ${v.kind}, title = ${v.title}, description = ${v.description}, tip = ${v.tip ?? null},
        interests = ${v.interests}, cost = ${v.cost}, points = ${v.points}, place_category = ${v.place_category ?? null},
        coastal_only = ${v.coastal_only}, months = ${v.months}, active = ${v.active}, featured = ${v.featured}, updated_at = now()
      where id = ${id}`);
  } catch (err) {
    if (/unique/i.test((err as Error).message)) return { fieldErrors: { slug: 'That slug is already used' }, error: 'Please fix the highlighted fields.' };
    throw err;
  }
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Saved.' };
}

// ───────────────────────────── Categories ─────────────────────────────

const categorySchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]{2,40}$/, 'Lowercase letters, numbers and dashes'),
  kind: z.enum(['place', 'event']),
  label: z.string().trim().min(2).max(40),
  description: optText(200),
  icon: z.string().refine((i) => ICON_NAMES.includes(i), 'Choose an icon'),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Use a hex colour like #4f86b8'),
  osm_filters: z.array(z.string()),
  event_categories: z.array(z.string()),
  keywords: z.array(z.string()),
  sort: z.coerce.number().int().min(0).max(999),
  active: z.boolean(),
});

const lines = (v: string | undefined) =>
  (v ?? '')
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

export async function saveCategoryAction(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const isNew = form.get('isNew') === '1';
  const parsed = categorySchema.safeParse({
    slug: get(form, 'slug'),
    kind: get(form, 'kind'),
    label: get(form, 'label'),
    description: get(form, 'description') ?? '',
    icon: get(form, 'icon'),
    color: get(form, 'color'),
    osm_filters: lines(get(form, 'osm_filters')),
    event_categories: lines(get(form, 'event_categories')),
    keywords: lines(get(form, 'keywords')).map((k) => k.toLowerCase()),
    sort: get(form, 'sort') ?? '0',
    active: form.get('active') === 'on',
  });
  if (!parsed.success) return issues(parsed.error);
  const v = parsed.data;
  const bad = v.osm_filters.find((f) => !parseFilter(f));
  if (bad) return { fieldErrors: { osm_filters: `“${bad}” isn’t a tag filter like amenity=cafe` }, error: 'Please fix the highlighted fields.' };
  if (isNew) {
    const exists = await maybeOne(sql`select 1 from categories where slug = ${v.slug}`);
    if (exists) return { fieldErrors: { slug: 'That slug is already used' }, error: 'Please fix the highlighted fields.' };
    await query(sql`
      insert into categories (slug, kind, label, description, icon, color, osm_filters, event_categories, keywords, sort, active)
      values (${v.slug}, ${v.kind}, ${v.label}, ${v.description ?? null}, ${v.icon}, ${v.color}, ${v.osm_filters}, ${v.event_categories}, ${v.keywords}, ${v.sort}, ${v.active})`);
  } else {
    const filtersChanged = await maybeOne<{ changed: boolean }>(sql`
      select osm_filters is distinct from ${v.osm_filters}::text[] as changed from categories where slug = ${v.slug}`);
    await query(sql`
      update categories set label = ${v.label}, description = ${v.description ?? null}, icon = ${v.icon}, color = ${v.color},
        osm_filters = ${v.osm_filters}, event_categories = ${v.event_categories}, keywords = ${v.keywords}, sort = ${v.sort}, active = ${v.active}
      where slug = ${v.slug}`);
    // New tag filters mean cached map areas must be fetched again.
    if (filtersChanged?.changed) await query(sql`delete from place_sync_cells where category_slug = ${v.slug}`);
  }
  revalidatePath('/', 'layout');
  return { ok: true, message: `${v.label} saved.` };
}

// ───────────────────────────── Users ─────────────────────────────

export async function setUserRoleAction(id: string, role: 'user' | 'admin') {
  const me = await requireAdmin();
  if (id === me.id && role !== 'admin') return; // don't lock yourself out
  await query(sql`update users set role = ${role} where id = ${id}`);
  revalidatePath('/admin/users');
}
