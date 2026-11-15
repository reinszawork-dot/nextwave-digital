import 'server-only';
import { createHash } from 'node:crypto';
import { CITIES, haversineKm } from '@/lib/cities';
import { maybeOne, query, sql } from '../db';
import { geocodeOne } from '../geocode';
import { safeFetchText } from '../safe-fetch';
import { getCategories } from '../services/categories';
import { classifyEvent, type ClassifierCategory } from './classify';
import { fetchQuicket } from './providers/quicket';
import { fetchTicketmaster } from './providers/ticketmaster';
import { parseIcal } from './providers/ical';
import { parseJsonLdEvents } from './providers/jsonld';
import { NeedsCredentialsError, type ImportedEvent, type ProviderResult } from './types';

export interface EventSource {
  id: string;
  kind: 'ticketmaster' | 'quicket' | 'ical' | 'jsonld';
  name: string;
  url: string | null;
  city_slug: string | null;
  default_category: string | null;
  config: Record<string, unknown>;
  enabled: boolean;
  last_run_at: Date | null;
  last_status: string | null;
  last_message: string | null;
}

/** Fields an admin can correct; their corrections survive later imports. */
export const LOCKABLE_FIELDS = [
  'title', 'description', 'category_slug', 'starts_at', 'ends_at', 'venue_name', 'address', 'city_slug',
  'lat', 'lng', 'price_min', 'price_max', 'is_free', 'ticket_url', 'image_url', 'organiser',
] as const;

/** How far from a city an event can be and still be listed under it. */
const CITY_RADIUS_KM = 60;

export function assignCity(ev: Pick<ImportedEvent, 'lat' | 'lng' | 'cityHint' | 'address'>, fallback: string | null): string | null {
  if (ev.lat != null && ev.lng != null) {
    // Prefer the nearest launch city (Joburg, Cape Town, Pretoria, Durban), then any listed town.
    const near = CITIES.map((c) => ({ c, km: haversineKm(ev.lat!, ev.lng!, c.lat, c.lng) }))
      .filter((x) => x.km <= CITY_RADIUS_KM)
      .sort((a, b) => a.km - b.km);
    return (near.find((x) => x.c.events) ?? near[0])?.c.slug ?? null;
  }
  const text = `${ev.cityHint ?? ''} ${ev.address ?? ''}`.toLowerCase();
  const aliases: Record<string, string[]> = {
    johannesburg: ['johannesburg', 'joburg', 'jozi', 'sandton', 'soweto', 'randburg', 'rosebank', 'braamfontein', 'midrand', 'fourways'],
    'cape-town': ['cape town', 'kaapstad', 'sea point', 'woodstock', 'observatory', 'stellenbosch', 'muizenberg', 'camps bay', 'bellville'],
    pretoria: ['pretoria', 'tshwane', 'centurion', 'hatfield', 'menlyn'],
    durban: ['durban', 'ethekwini', 'umhlanga', 'ballito', 'morningside', 'berea', 'pinetown'],
  };
  for (const [slug, words] of Object.entries(aliases)) if (words.some((w) => text.includes(w))) return slug;
  for (const c of CITIES) if (text.includes(c.name.toLowerCase())) return c.slug;
  return fallback;
}

function contentHash(ev: ImportedEvent, category: string, city: string | null): string {
  return createHash('sha1')
    .update(
      JSON.stringify([
        ev.title, ev.description, category, ev.startsAt.toISOString(), ev.endsAt?.toISOString() ?? null, ev.venueName,
        ev.address, city, ev.lat, ev.lng, ev.priceMin, ev.priceMax, ev.isFree, ev.ticketUrl, ev.imageUrl, ev.organiser, !!ev.cancelled,
      ]),
    )
    .digest('hex');
}

export const isExpired = (ev: { startsAt: Date; endsAt?: Date | null }, now = new Date()) =>
  (ev.endsAt ?? new Date(ev.startsAt.getTime() + 6 * 3_600_000)).getTime() < now.getTime();

async function fetchSource(source: EventSource): Promise<ProviderResult> {
  switch (source.kind) {
    case 'ticketmaster':
      return fetchTicketmaster(source);
    case 'quicket':
      return fetchQuicket(source);
    case 'ical': {
      if (!source.url) throw new Error('This feed has no URL.');
      const { text } = await safeFetchText(source.url, { accept: 'text/calendar,text/plain;q=0.8,*/*;q=0.5' });
      if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error('That link didn’t return an iCalendar (.ics) feed.');
      const events = parseIcal(text);
      return { events, complete: true, note: `${events.length} events in the feed` };
    }
    case 'jsonld': {
      if (!source.url) throw new Error('This page source has no URL.');
      const { text, finalUrl } = await safeFetchText(source.url);
      const events = parseJsonLdEvents(text, finalUrl);
      return { events, complete: true, note: `${events.length} schema.org events on the page` };
    }
  }
}

interface Counts {
  created: number;
  updated: number;
  unchanged: number;
  removed: number;
  skipped: number;
}

/** Store a batch of normalised events from one source. */
export async function storeEvents(
  source: Pick<EventSource, 'id' | 'kind' | 'city_slug' | 'default_category'>,
  result: ProviderResult,
  categories: ClassifierCategory[],
): Promise<Counts> {
  const counts: Counts = { created: 0, updated: 0, unchanged: 0, removed: 0, skipped: 0 };
  const now = new Date();
  const ids = result.events.map((e) => e.sourceId);
  const existing = new Map(
    (
      await query<{ id: string; source_id: string; content_hash: string | null; status: string; locked_fields: string[] }>(sql`
        select id, source_id, content_hash, status, locked_fields from events
        where source = ${source.kind} and source_id = any(${ids})`)
    ).map((r) => [r.source_id, r]),
  );

  for (const ev of result.events) {
    if (isExpired(ev, now) || ev.title.length < 2) {
      counts.skipped++;
      continue;
    }
    const city = assignCity(ev, source.city_slug);
    if (!city && ev.lat == null) {
      counts.skipped++; // outside the areas SOMMR covers
      continue;
    }
    const category = classifyEvent(
      { title: ev.title, description: ev.description, hints: ev.categoryHints },
      categories,
      source.default_category ?? 'other',
    );
    const hash = contentHash(ev, category, city);
    const prior = existing.get(ev.sourceId);
    const status = ev.cancelled ? 'cancelled' : 'published';
    if (!prior) {
      await query(sql`
        insert into events (source, source_id, source_ref, source_url, title, description, category_slug, starts_at, ends_at,
          all_day, venue_name, address, city_slug, lat, lng, price_min, price_max, currency, is_free, ticket_url, image_url,
          organiser, status, content_hash, last_seen_at)
        values (${source.kind}, ${ev.sourceId}, ${source.id}, ${ev.sourceUrl ?? null}, ${ev.title}, ${ev.description ?? null},
          ${category}, ${ev.startsAt}, ${ev.endsAt ?? null}, ${ev.allDay ?? false}, ${ev.venueName ?? null}, ${ev.address ?? null},
          ${city}, ${ev.lat ?? null}, ${ev.lng ?? null}, ${ev.priceMin ?? null}, ${ev.priceMax ?? null}, ${ev.currency ?? 'ZAR'},
          ${ev.isFree ?? null}, ${ev.ticketUrl ?? null}, ${ev.imageUrl ?? null}, ${ev.organiser ?? null}, ${status}, ${hash}, now())
        on conflict (source, source_id) do nothing`);
      counts.created++;
      continue;
    }
    if (prior.content_hash === hash && prior.status !== 'archived') {
      await query(sql`update events set last_seen_at = now() where id = ${prior.id}`);
      counts.unchanged++;
      continue;
    }
    const locked = new Set(prior.locked_fields);
    const set = (field: (typeof LOCKABLE_FIELDS)[number], value: unknown) =>
      locked.has(field) ? null : sql`${sql.raw(field)} = ${value}`;
    const assignments = [
      set('title', ev.title),
      set('description', ev.description ?? null),
      set('category_slug', category),
      set('starts_at', ev.startsAt),
      set('ends_at', ev.endsAt ?? null),
      set('venue_name', ev.venueName ?? null),
      set('address', ev.address ?? null),
      set('city_slug', city),
      set('lat', ev.lat ?? null),
      set('lng', ev.lng ?? null),
      set('price_min', ev.priceMin ?? null),
      set('price_max', ev.priceMax ?? null),
      set('is_free', ev.isFree ?? null),
      set('ticket_url', ev.ticketUrl ?? null),
      set('image_url', ev.imageUrl ?? null),
      set('organiser', ev.organiser ?? null),
    ].filter(Boolean) as ReturnType<typeof sql>[];
    // Admin rejections stick; otherwise follow the provider (including un-cancelling).
    const nextStatus = prior.status === 'rejected' ? 'rejected' : status;
    await query(sql`
      update events set ${sql.join(assignments)}, source_url = ${ev.sourceUrl ?? null}, status = ${nextStatus},
        content_hash = ${hash}, last_seen_at = now(), updated_at = now(), source_ref = ${source.id}
      where id = ${prior.id}`);
    counts.updated++;
  }

  // A complete feed tells us which upcoming events were taken down.
  if (result.complete) {
    const removed = await query(sql`
      update events set status = 'archived', review_note = 'No longer listed by the source', updated_at = now()
      where source_ref = ${source.id} and status = 'published' and starts_at > now()
        and not (source_id = any(${ids}))
      returning id`);
    counts.removed = removed.length;
  }
  return counts;
}

/** Hide everything that has finished (events are never shown as current once over). */
export async function archiveExpired(): Promise<number> {
  const rows = await query(sql`
    update events set status = 'archived', updated_at = now()
    where status in ('published', 'pending')
      and coalesce(ends_at, starts_at + interval '6 hours') < now() - interval '2 hours'
    returning id`);
  return rows.length;
}

/** Find coordinates for upcoming events that only have a venue/address (OpenStreetMap Nominatim). */
export async function geocodeMissing(limit = 20): Promise<number> {
  const rows = await query<{ id: string; venue_name: string | null; address: string | null; city_slug: string | null }>(sql`
    select id, venue_name, address, city_slug from events
    where lat is null and status = 'published' and starts_at > now() - interval '1 day'
      and not ('lat' = any(locked_fields))
      and coalesce(venue_name, address) is not null
    order by starts_at limit ${limit}`);
  let found = 0;
  for (const r of rows) {
    const cityName = CITIES.find((c) => c.slug === r.city_slug)?.name ?? '';
    const text = [r.venue_name, r.address, cityName].filter(Boolean).join(', ');
    try {
      const hit = await geocodeOne(text);
      if (hit) {
        await query(sql`update events set lat = ${hit.lat}, lng = ${hit.lng},
          city_slug = coalesce(city_slug, ${assignCity({ lat: hit.lat, lng: hit.lng }, null)}) where id = ${r.id}`);
        found++;
      }
    } catch {
      break; // geocoder unavailable; try again next run
    }
  }
  return found;
}

export async function runSource(source: EventSource, trigger: 'cron' | 'admin' | 'cli') {
  const run = await maybeOne<{ id: string }>(sql`
    insert into import_runs (source_ref, trigger) values (${source.id}, ${trigger}) returning id`);
  const categories = (await getCategories('event')).map((c) => ({ slug: c.slug, keywords: c.keywords }));
  try {
    const result = await fetchSource(source);
    const counts = await storeEvents(source, result, categories);
    const message = `${result.note ?? ''}${result.note ? ' · ' : ''}${counts.created} new, ${counts.updated} updated, ${counts.removed} removed, ${counts.skipped} skipped`;
    await query(sql`
      update import_runs set status = 'ok', finished_at = now(), created_count = ${counts.created}, updated_count = ${counts.updated},
        unchanged_count = ${counts.unchanged}, removed_count = ${counts.removed}, skipped_count = ${counts.skipped}, message = ${message}
      where id = ${run!.id}`);
    await query(sql`update event_sources set last_run_at = now(), last_status = 'ok', last_message = ${message} where id = ${source.id}`);
    return { status: 'ok' as const, message, counts };
  } catch (err) {
    const needsKey = err instanceof NeedsCredentialsError;
    const status = needsKey ? 'needs_credentials' : 'error';
    const message = (err as Error).message.slice(0, 500);
    await query(sql`update import_runs set status = ${status}, finished_at = now(), message = ${message} where id = ${run!.id}`);
    await query(sql`update event_sources set last_run_at = now(), last_status = ${status}, last_message = ${message} where id = ${source.id}`);
    return { status, message, counts: null };
  }
}

/** Import every enabled source, archive finished events and fill in missing coordinates. */
export async function runAllImports(trigger: 'cron' | 'admin' | 'cli') {
  const sources = await query<EventSource & Record<string, unknown>>(sql`
    select * from event_sources where enabled order by kind, name`);
  const results = [];
  for (const s of sources) results.push({ source: s.name, ...(await runSource(s, trigger)) });
  const archived = await archiveExpired();
  const geocoded = await geocodeMissing();
  return { results, archived, geocoded };
}
