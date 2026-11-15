import 'server-only';
import { maybeOne, query, sql } from '../db';
import { SqlFragment } from '../sql';
import { getCategories, type Category } from '../services/categories';
import {
  addressFromTags,
  fetchOsmPlaces,
  matchesFilter,
  parseFilter,
  pickTags,
  websiteFromTags,
  type Bbox,
  type OsmElement,
  type OsmFilter,
} from './osm';

/** Grid size for caching OpenStreetMap downloads: 0.1° ≈ 11 km. */
export const CELL_DEG = 0.1;
const SYNC_TTL_DAYS = 14;
const MAX_CELLS_PER_REQUEST = 6;
/** Viewports larger than this (in degrees) only show what's already cached. */
export const MAX_SYNC_SPAN = 0.36;

export interface PlaceRow {
  id: string;
  source: 'osm' | 'admin' | 'community';
  source_id: string | null;
  name: string;
  category_slug: string;
  lat: number;
  lng: number;
  address: string | null;
  suburb: string | null;
  city: string | null;
  description: string | null;
  website: string | null;
  phone: string | null;
  opening_hours: string | null;
  image_url: string | null;
  tags: Record<string, string>;
  status: string;
  featured: boolean;
  featured_note: string | null;
  saves: number;
  saved_at: Date | null;
  visited_at: Date | null;
  distance_km?: number;
  last_synced_at: Date | null;
  updated_at: Date;
}

export function cellKey(lat: number, lng: number): string {
  const la = Math.floor(lat / CELL_DEG) * CELL_DEG;
  const lo = Math.floor(lng / CELL_DEG) * CELL_DEG;
  return `${la.toFixed(1)}:${lo.toFixed(1)}`;
}

export function cellBbox(key: string): Bbox {
  const [la, lo] = key.split(':').map(Number);
  return { south: la, west: lo, north: la + CELL_DEG, east: lo + CELL_DEG };
}

export function cellsForBbox(b: Bbox): string[] {
  const keys: string[] = [];
  const startLat = Math.floor(b.south / CELL_DEG) * CELL_DEG;
  const startLng = Math.floor(b.west / CELL_DEG) * CELL_DEG;
  for (let la = startLat; la < b.north; la += CELL_DEG) {
    for (let lo = startLng; lo < b.east; lo += CELL_DEG) {
      keys.push(cellKey(la + CELL_DEG / 2, lo + CELL_DEG / 2));
    }
  }
  return keys;
}

/** Order cells nearest-first around a point so the visible centre loads first. */
function nearestFirst(cells: string[], lat: number, lng: number) {
  return [...cells].sort((a, b) => {
    const [aa, ao] = a.split(':').map(Number);
    const [ba, bo] = b.split(':').map(Number);
    const da = (aa + CELL_DEG / 2 - lat) ** 2 + (ao + CELL_DEG / 2 - lng) ** 2;
    const db = (ba + CELL_DEG / 2 - lat) ** 2 + (bo + CELL_DEG / 2 - lng) ** 2;
    return da - db;
  });
}

export function categorise(el: OsmElement, cats: { slug: string; filters: OsmFilter[] }[]): string | null {
  for (const c of cats) if (c.filters.some((f) => matchesFilter(el.tags, f))) return c.slug;
  return null;
}

function osmCategories(categories: Category[]) {
  return categories
    .filter((c) => c.kind === 'place' && c.active && c.osm_filters.length > 0)
    .map((c) => ({ slug: c.slug, filters: c.osm_filters.map(parseFilter).filter((f): f is OsmFilter => !!f) }));
}

async function upsertElements(elements: OsmElement[], cats: { slug: string; filters: OsmFilter[] }[]) {
  const rows = elements
    .map((el) => ({ el, category: categorise(el, cats) }))
    .filter((r): r is { el: OsmElement; category: string } => !!r.category);
  for (let i = 0; i < rows.length; i += 250) {
    const chunk = rows.slice(i, i + 250).map(({ el, category }) => {
      const { address, suburb, city } = addressFromTags(el.tags);
      return sql`('osm', ${el.sourceId}, ${el.tags.name.slice(0, 200)}, ${category}, ${el.lat}, ${el.lng},
        ${address}, ${suburb}, ${city}, ${websiteFromTags(el.tags)},
        ${el.tags.phone ?? el.tags['contact:phone'] ?? null}, ${el.tags.opening_hours ?? null},
        ${JSON.stringify(pickTags(el.tags))}::jsonb, now())`;
    });
    const locked = (field: string) => sql.raw(`case when '${field}' = any(places.locked_fields) then places.${field} else excluded.${field} end`);
    await query(sql`
      insert into places (source, source_id, name, category_slug, lat, lng, address, suburb, city, website, phone, opening_hours, tags, last_synced_at)
      values ${sql.join(chunk)}
      on conflict (source, source_id) do update set
        name = ${locked('name')},
        lat = ${locked('lat')},
        lng = ${locked('lng')},
        address = ${locked('address')},
        suburb = ${locked('suburb')},
        city = ${locked('city')},
        website = ${locked('website')},
        phone = ${locked('phone')},
        opening_hours = ${locked('opening_hours')},
        tags = excluded.tags,
        last_synced_at = now(),
        updated_at = now()`);
  }
  return rows.length;
}

const inFlight = new Map<string, Promise<void>>();

/**
 * Make sure the given cells have fresh OpenStreetMap data for the requested
 * categories. Returns how the data was fetched, or an error message.
 */
export async function ensureCells(cells: string[], wanted: string[]): Promise<{ synced: number; error?: string }> {
  const categories = await getCategories('place');
  const all = osmCategories(categories);
  const wantedOsm = all.filter((c) => wanted.includes(c.slug));
  if (cells.length === 0 || wantedOsm.length === 0) return { synced: 0 };

  const fresh = await query<{ cell: string; category_slug: string }>(sql`
    select cell, category_slug from place_sync_cells
    where cell = any(${cells}) and category_slug = any(${wantedOsm.map((c) => c.slug)})
      and status = 'ok' and synced_at > now() - make_interval(days => ${SYNC_TTL_DAYS})`);
  const freshSet = new Set(fresh.map((f) => `${f.cell}|${f.category_slug}`));
  const stale = cells
    .filter((cell) => wantedOsm.some((c) => !freshSet.has(`${cell}|${c.slug}`)))
    .slice(0, MAX_CELLS_PER_REQUEST);

  let synced = 0;
  let error: string | undefined;
  let slowFallback = false;
  for (const cell of stale) {
    // The Nominatim fallback is slow (one request per tag per second): fill one cell per request.
    if (slowFallback) break;
    const missing = wantedOsm.filter((c) => !freshSet.has(`${cell}|${c.slug}`));
    const flightKey = `${cell}|${missing.map((m) => m.slug).join(',')}`;
    let job = inFlight.get(flightKey);
    if (!job) {
      job = (async () => {
        // Overpass returns every category in one go; the fallback only fetches what's missing.
        const { elements, via } = await fetchOsmPlaces(
          cellBbox(cell),
          all.flatMap((c) => c.filters),
          missing.flatMap((c) => c.filters),
        );
        if (via === 'nominatim') slowFallback = true;
        const coveredCats = via === 'overpass' ? all : missing;
        const count = await upsertElements(elements, coveredCats);
        for (const c of coveredCats) {
          await query(sql`
            insert into place_sync_cells (cell, category_slug, synced_at, element_count, status)
            values (${cell}, ${c.slug}, now(), ${count}, 'ok')
            on conflict (cell, category_slug) do update set synced_at = now(), element_count = ${count}, status = 'ok'`);
        }
      })();
      inFlight.set(flightKey, job);
      job.finally(() => inFlight.delete(flightKey)).catch(() => {});
    }
    try {
      await job;
      synced++;
    } catch (err) {
      error = 'Live place data is temporarily unavailable. Showing what we have.';
      console.warn('[places] sync failed for cell', cell, (err as Error).message);
      break;
    }
  }
  return { synced, error };
}

const SELECT_PLACE = (userId: string | null) => sql`
  select p.*,
    (select count(*) from place_marks s where s.place_id = p.id and s.saved_at is not null)::int as saves,
    m.saved_at, m.visited_at
  from places p
  left join place_marks m on m.place_id = p.id and m.user_id = ${userId}`;

const RANK = sql.raw(
  `p.featured desc, saves desc, ((p.website is not null)::int + (p.opening_hours is not null)::int + (p.description is not null)::int) desc`,
);

function distanceExpr(lat: number, lng: number): SqlFragment {
  const cos = Math.cos((lat * Math.PI) / 180);
  return sql`sqrt(power((p.lat - ${lat}) * 111.32, 2) + power((p.lng - ${lng}) * ${111.32 * cos}, 2))`;
}

export async function placesInBbox(opts: {
  bbox: Bbox;
  categories: string[];
  userId: string | null;
  q?: string;
  limit?: number;
}): Promise<PlaceRow[]> {
  const { bbox, categories, userId, q } = opts;
  const centerLat = (bbox.south + bbox.north) / 2;
  const centerLng = (bbox.west + bbox.east) / 2;
  return query<PlaceRow & Record<string, unknown>>(sql`
    ${SELECT_PLACE(userId)}
    where p.status = 'published'
      and p.lat between ${bbox.south} and ${bbox.north}
      and p.lng between ${bbox.west} and ${bbox.east}
      and p.category_slug = any(${categories})
      ${q ? sql`and p.name ilike ${'%' + q.replace(/[%_\\]/g, '\\$&') + '%'}` : sql.empty}
    order by ${RANK}, ${distanceExpr(centerLat, centerLng)}
    limit ${opts.limit ?? 400}`);
}

/** Places near a point (synced first if needed), best-ranked within the radius. */
export async function nearbyPlaces(opts: {
  lat: number;
  lng: number;
  categories: string[];
  userId: string | null;
  radiusKm?: number;
  limit?: number;
  sync?: boolean;
}): Promise<{ places: PlaceRow[]; error?: string }> {
  const { lat, lng, categories, userId, radiusKm = 12, limit = 12 } = opts;
  let error: string | undefined;
  if (opts.sync !== false) {
    const d = 0.05;
    const cells = nearestFirst(cellsForBbox({ south: lat - d, north: lat + d, west: lng - d, east: lng + d }), lat, lng);
    error = (await ensureCells(cells.slice(0, 4), categories)).error;
  }
  const dist = distanceExpr(lat, lng);
  const span = radiusKm / 111;
  const rows = await query<PlaceRow & Record<string, unknown>>(sql`
    select q.* from (
      select p.*, ${dist} as distance_km,
        (select count(*) from place_marks s where s.place_id = p.id and s.saved_at is not null)::int as saves,
        m.saved_at, m.visited_at,
        row_number() over (partition by p.category_slug order by p.featured desc, ${dist}) as rank_in_cat
      from places p
      left join place_marks m on m.place_id = p.id and m.user_id = ${userId}
      where p.status = 'published'
        and p.category_slug = any(${categories})
        and p.lat between ${lat - span} and ${lat + span}
        and p.lng between ${lng - span * 1.3} and ${lng + span * 1.3}
    ) q
    where q.distance_km <= ${radiusKm}
    order by q.featured desc, q.saves desc, q.rank_in_cat, q.distance_km
    limit ${limit}`);
  return { places: rows, error };
}

export async function getPlace(id: string, userId: string | null): Promise<PlaceRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return maybeOne<PlaceRow & Record<string, unknown>>(sql`${SELECT_PLACE(userId)} where p.id = ${id}`);
}

export async function markPlace(userId: string, placeId: string, field: 'saved' | 'visited', on: boolean) {
  const col = field === 'saved' ? sql.raw('saved_at') : sql.raw('visited_at');
  await query(sql`
    insert into place_marks (user_id, place_id, ${col})
    values (${userId}, ${placeId}, ${on ? new Date() : null})
    on conflict (user_id, place_id) do update set ${col} = ${on ? sql`coalesce(place_marks.${col}, now())` : sql`null`}`);
  await query(sql`delete from place_marks where user_id = ${userId} and place_id = ${placeId} and saved_at is null and visited_at is null`);
}

export async function savedPlaces(userId: string, field: 'saved' | 'visited' = 'saved', limit = 100): Promise<PlaceRow[]> {
  const col = field === 'saved' ? sql.raw('m.saved_at') : sql.raw('m.visited_at');
  return query<PlaceRow & Record<string, unknown>>(sql`
    select p.*, m.saved_at, m.visited_at, 0 as saves
    from place_marks m join places p on p.id = m.place_id
    where m.user_id = ${userId} and ${col} is not null and p.status = 'published'
    order by ${col} desc limit ${limit}`);
}

/** OpenStreetMap link for attribution and "edit this place". */
export function osmUrl(sourceId: string | null): string | null {
  if (!sourceId) return null;
  const [type, id] = sourceId.split('/');
  return type && id ? `https://www.openstreetmap.org/${type}/${id}` : null;
}
