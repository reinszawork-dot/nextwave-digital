import 'server-only';
import { maybeOne, query, sql } from './db';
import { env } from './env';
import { nominatimFetch } from './places/osm';

export interface GeoResult {
  label: string;
  lat: number;
  lng: number;
  type: string;
  bbox: [number, number, number, number] | null; // south, north, west, east
}

/** Search South African places (towns, suburbs, landmarks) via OpenStreetMap Nominatim. */
export async function searchLocations(q: string): Promise<GeoResult[]> {
  const text = q.trim().slice(0, 120);
  if (text.length < 2) return [];
  const cacheKey = `search:${text.toLowerCase()}`;
  const cached = await maybeOne<{ label: string; found: boolean }>(sql`
    select label, found from geocode_cache where query = ${cacheKey} and created_at > now() - interval '30 days'`);
  if (cached) return cached.found ? (JSON.parse(cached.label) as GeoResult[]) : [];
  const url = new URL('/search', env.NOMINATIM_URL);
  url.searchParams.set('q', text);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('countrycodes', 'za');
  url.searchParams.set('limit', '6');
  url.searchParams.set('addressdetails', '1');
  const res = await nominatimFetch(url);
  if (!res.ok) throw new Error(`Location search failed (HTTP ${res.status})`);
  const rows = (await res.json()) as {
    display_name: string;
    lat: string;
    lon: string;
    type: string;
    addresstype?: string;
    name?: string;
    boundingbox?: string[];
  }[];
  const results: GeoResult[] = rows.map((r) => ({
    label: r.display_name.replace(/, South Africa$/, ''),
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    type: r.addresstype ?? r.type,
    bbox: r.boundingbox ? (r.boundingbox.map(Number) as [number, number, number, number]) : null,
  }));
  await query(sql`
    insert into geocode_cache (query, found, label) values (${cacheKey}, ${results.length > 0}, ${JSON.stringify(results)})
    on conflict (query) do update set found = excluded.found, label = excluded.label, created_at = now()`);
  return results;
}

/** Best single coordinate for a venue/address (cached, including misses). */
export async function geocodeOne(text: string): Promise<{ lat: number; lng: number } | null> {
  const key = `one:${text.trim().toLowerCase().slice(0, 200)}`;
  const cached = await maybeOne<{ found: boolean; lat: number | null; lng: number | null }>(sql`
    select found, lat, lng from geocode_cache where query = ${key}`);
  if (cached) return cached.found && cached.lat != null && cached.lng != null ? { lat: cached.lat, lng: cached.lng } : null;
  const url = new URL('/search', env.NOMINATIM_URL);
  url.searchParams.set('q', text.slice(0, 200));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('countrycodes', 'za');
  url.searchParams.set('limit', '1');
  const res = await nominatimFetch(url);
  if (!res.ok) return null;
  const [hit] = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  await query(sql`
    insert into geocode_cache (query, found, lat, lng, label)
    values (${key}, ${!!hit}, ${hit ? parseFloat(hit.lat) : null}, ${hit ? parseFloat(hit.lon) : null}, ${hit?.display_name ?? null})
    on conflict (query) do nothing`);
  return hit ? { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) } : null;
}

/** Reverse geocode a coordinate to a short area name (for "use my location"). */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = `rev:${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = await maybeOne<{ label: string | null }>(sql`select label from geocode_cache where query = ${key}`);
  if (cached) return cached.label;
  const url = new URL('/reverse', env.NOMINATIM_URL);
  url.searchParams.set('lat', lat.toFixed(5));
  url.searchParams.set('lon', lng.toFixed(5));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('zoom', '14');
  const res = await nominatimFetch(url);
  if (!res.ok) return null;
  const d = (await res.json()) as { address?: Record<string, string> };
  const a = d.address ?? {};
  const label = a.suburb ?? a.town ?? a.city ?? a.village ?? a.county ?? null;
  await query(sql`
    insert into geocode_cache (query, found, lat, lng, label) values (${key}, ${!!label}, ${lat}, ${lng}, ${label})
    on conflict (query) do nothing`);
  return label;
}
