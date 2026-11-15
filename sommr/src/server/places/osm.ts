import 'server-only';
import { env, userAgent } from '../env';

/**
 * Real places from OpenStreetMap (© OpenStreetMap contributors, ODbL).
 *
 * Primary source: the Overpass API — one query per map grid cell returns every
 * category at once. If every Overpass endpoint fails, a small, rate-limited
 * Nominatim category search is used as a fallback (on by default in development;
 * set PLACES_NOMINATIM_FALLBACK=true to allow it in production — light use only,
 * per the Nominatim usage policy).
 */

export interface OsmFilter {
  key: string;
  values: string[];
}

export interface OsmElement {
  sourceId: string; // e.g. node/123
  lat: number;
  lng: number;
  tags: Record<string, string>;
}

export interface Bbox {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** 'amenity=cafe' or 'leisure=park|garden' → { key, values } */
export function parseFilter(f: string): OsmFilter | null {
  const m = f.trim().match(/^([a-z_:]+)=([a-z0-9_|:;-]+)$/i);
  if (!m) return null;
  return { key: m[1], values: m[2].split('|').filter(Boolean) };
}

export function matchesFilter(tags: Record<string, string>, filter: OsmFilter): boolean {
  const v = tags[filter.key];
  return v !== undefined && filter.values.includes(v);
}

export function buildOverpassQuery(bbox: Bbox, filters: OsmFilter[], limit = 2000): string {
  const box = `${bbox.south.toFixed(5)},${bbox.west.toFixed(5)},${bbox.north.toFixed(5)},${bbox.east.toFixed(5)}`;
  const clauses = filters.map((f) => {
    const sel =
      f.values.length === 1
        ? `["${f.key}"="${f.values[0]}"]`
        : `["${f.key}"~"^(${f.values.map((v) => v.replace(/[^a-z0-9_:-]/gi, '')).join('|')})$"]`;
    return `  nwr${sel}["name"](${box});`;
  });
  return `[out:json][timeout:30];\n(\n${clauses.join('\n')}\n);\nout center tags ${limit};`;
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export function parseOverpass(json: { elements?: OverpassElement[] }): OsmElement[] {
  const out: OsmElement[] = [];
  for (const el of json.elements ?? []) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null || !el.tags?.name) continue;
    out.push({ sourceId: `${el.type}/${el.id}`, lat, lng, tags: el.tags });
  }
  return out;
}

/** After every endpoint fails, skip Overpass for a few minutes instead of waiting on timeouts. */
let overpassDownUntil = 0;

async function fetchOverpass(query: string): Promise<OsmElement[]> {
  if (Date.now() < overpassDownUntil) throw new Error('Overpass recently unreachable (backing off)');
  let lastError: unknown = null;
  for (const url of env.OVERPASS_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': userAgent() },
        body: new URLSearchParams({ data: query }),
        // The main instance gets longer; mirrors are a quick second try.
        signal: AbortSignal.timeout(url === env.OVERPASS_URLS[0] ? 15_000 : 7_000),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Overpass ${new URL(url).host} HTTP ${res.status}`);
      return parseOverpass(await res.json());
    } catch (err) {
      lastError = err;
    }
  }
  overpassDownUntil = Date.now() + 5 * 60_000;
  throw lastError ?? new Error('No Overpass endpoint configured');
}

// ───────────────────────────── Nominatim fallback ─────────────────────────────

let nominatimQueue: Promise<unknown> = Promise.resolve();
/** Serialise Nominatim calls to at most one per second (usage policy). */
export function nominatimFetch(url: URL): Promise<Response> {
  const run = nominatimQueue.then(async () => {
    if (env.NOMINATIM_EMAIL) url.searchParams.set('email', env.NOMINATIM_EMAIL);
    const res = await fetch(url, {
      headers: { 'User-Agent': userAgent(), Referer: env.APP_URL, 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(12_000),
      cache: 'no-store',
    });
    await new Promise((r) => setTimeout(r, 1100));
    return res;
  });
  nominatimQueue = run.catch(() => undefined);
  return run;
}

interface NominatimResult {
  osm_type: 'node' | 'way' | 'relation';
  osm_id: number;
  lat: string;
  lon: string;
  name?: string;
  category?: string;
  type?: string;
  extratags?: Record<string, string> | null;
  address?: Record<string, string>;
}

export function nominatimFallbackEnabled(): boolean {
  const v = process.env.PLACES_NOMINATIM_FALLBACK;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return !env.isProduction;
}

async function fetchNominatim(bbox: Bbox, filters: OsmFilter[]): Promise<OsmElement[]> {
  const out = new Map<string, OsmElement>();
  for (const f of filters) {
    for (const value of f.values) {
      const url = new URL('/search', env.NOMINATIM_URL);
      url.searchParams.set('q', `[${f.key}=${value}]`);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('viewbox', `${bbox.west},${bbox.north},${bbox.east},${bbox.south}`);
      url.searchParams.set('bounded', '1');
      url.searchParams.set('limit', '40');
      url.searchParams.set('extratags', '1');
      url.searchParams.set('addressdetails', '1');
      const res = await nominatimFetch(url);
      if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
      const rows = (await res.json()) as NominatimResult[];
      for (const r of rows) {
        if (!r.name) continue;
        const a = r.address ?? {};
        const tags: Record<string, string> = { ...(r.extratags ?? {}), name: r.name, [f.key]: value };
        if (a.road) tags['addr:street'] = a.road;
        if (a.house_number) tags['addr:housenumber'] = a.house_number;
        const area = [a.neighbourhood, a.quarter, a.suburb, a.city_district].find((v) => v && !WARD.test(v));
        if (area) tags['addr:suburb'] = area;
        if (a.city || a.town || a.village) tags['addr:city'] = a.city ?? a.town ?? a.village;
        out.set(`${r.osm_type}/${r.osm_id}`, {
          sourceId: `${r.osm_type}/${r.osm_id}`,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
          tags,
        });
      }
    }
  }
  return [...out.values()];
}

/**
 * Fetch named places inside a bounding box: all `filters` from Overpass, or — if
 * Overpass is unreachable and the fallback is allowed — just `fallbackFilters`
 * from Nominatim (it needs one request per tag, so we ask for less).
 */
export async function fetchOsmPlaces(
  bbox: Bbox,
  filters: OsmFilter[],
  fallbackFilters: OsmFilter[] = filters,
): Promise<{ elements: OsmElement[]; via: 'overpass' | 'nominatim' }> {
  try {
    return { elements: await fetchOverpass(buildOverpassQuery(bbox, filters)), via: 'overpass' };
  } catch (err) {
    if (!nominatimFallbackEnabled()) throw err;
    console.warn('[places] Overpass unavailable, using Nominatim fallback:', (err as Error).message);
    return { elements: await fetchNominatim(bbox, fallbackFilters), via: 'nominatim' };
  }
}

/** Municipal ward names ("Cape Town Ward 115") aren't meaningful to people. */
const WARD = /\bward\s*\d+/i;

/** Human-friendly address from OSM tags. */
export function addressFromTags(tags: Record<string, string>): { address: string | null; suburb: string | null; city: string | null } {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const rawSuburb = tags['addr:suburb'] ?? null;
  const suburb = rawSuburb && !WARD.test(rawSuburb) ? rawSuburb : null;
  const city = tags['addr:city'] ?? null;
  const parts = [street || tags['addr:place'], suburb, city].filter(Boolean);
  return { address: parts.length ? parts.join(', ') : null, suburb, city };
}

/** Keep the useful OSM tags only (the rest stays in OpenStreetMap). */
export function pickTags(tags: Record<string, string>): Record<string, string> {
  const keep = [
    'amenity', 'leisure', 'natural', 'tourism', 'shop', 'waterway', 'cuisine', 'outdoor_seating', 'wheelchair',
    'fee', 'access', 'diet:vegetarian', 'diet:vegan', 'takeaway', 'internet_access', 'description', 'wikipedia',
    'wikidata', 'operator', 'surface', 'supervised', 'lifeguard', 'dog', 'blue_flag',
  ];
  const out: Record<string, string> = {};
  for (const k of keep) if (tags[k]) out[k] = tags[k];
  return out;
}

export function websiteFromTags(tags: Record<string, string>): string | null {
  const w = tags.website ?? tags['contact:website'] ?? tags.url ?? null;
  if (!w) return null;
  const url = /^https?:\/\//i.test(w) ? w : `https://${w}`;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}
