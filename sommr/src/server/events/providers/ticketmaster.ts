import 'server-only';
import { getCity } from '@/lib/cities';
import { parseSaDateTime } from '@/lib/time';
import { env, userAgent } from '../../env';
import { NeedsCredentialsError, type ImportedEvent, type ProviderResult } from '../types';

/**
 * Ticketmaster Discovery API v2 — https://developer.ticketmaster.com
 * Needs TICKETMASTER_API_KEY (free; 5,000 calls/day). South African coverage on
 * the Discovery API is limited, so expect few results; the importer handles zero.
 */
const BASE = 'https://app.ticketmaster.com/discovery/v2/events.json';
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function geohash(lat: number, lng: number, precision = 7): string {
  let latR = [-90, 90];
  let lngR = [-180, 180];
  let hash = '';
  let bit = 0;
  let ch = 0;
  let even = true;
  while (hash.length < precision) {
    const range = even ? lngR : latR;
    const val = even ? lng : lat;
    const mid = (range[0] + range[1]) / 2;
    if (val >= mid) {
      ch |= 1 << (4 - bit);
      range[0] = mid;
    } else {
      range[1] = mid;
    }
    if (even) lngR = range;
    else latR = range;
    even = !even;
    if (bit < 4) bit++;
    else {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

interface TmImage {
  url: string;
  ratio?: string;
  width?: number;
}
export interface TmEvent {
  id: string;
  name: string;
  url?: string;
  info?: string;
  pleaseNote?: string;
  description?: string;
  dates?: {
    start?: { localDate?: string; localTime?: string; dateTime?: string; dateTBD?: boolean; timeTBA?: boolean; noSpecificTime?: boolean };
    end?: { localDate?: string; localTime?: string; dateTime?: string };
    status?: { code?: string };
  };
  images?: TmImage[];
  classifications?: { segment?: { name?: string }; genre?: { name?: string }; subGenre?: { name?: string } }[];
  priceRanges?: { min?: number; max?: number; currency?: string }[];
  promoter?: { name?: string };
  _embedded?: {
    venues?: {
      name?: string;
      address?: { line1?: string };
      city?: { name?: string };
      location?: { latitude?: string; longitude?: string };
    }[];
  };
}

function pickImage(images: TmImage[] = []): string | null {
  const wide = images.filter((i) => i.ratio === '16_9').sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  const best = wide.find((i) => (i.width ?? 0) <= 1300) ?? wide[0] ?? images[0];
  return best?.url ?? null;
}

export function mapTicketmasterEvent(e: TmEvent): ImportedEvent | null {
  const start = e.dates?.start;
  if (!start || start.dateTBD) return null;
  const allDay = !!(start.noSpecificTime || start.timeTBA || (!start.dateTime && !start.localTime));
  const startsAt = start.dateTime
    ? new Date(start.dateTime)
    : parseSaDateTime(start.localTime ? `${start.localDate}T${start.localTime}` : start.localDate);
  if (!startsAt || Number.isNaN(startsAt.getTime())) return null;
  const end = e.dates?.end;
  const endsAt = end?.dateTime ? new Date(end.dateTime) : end?.localDate ? parseSaDateTime(end.localTime ? `${end.localDate}T${end.localTime}` : end.localDate) : null;
  const venue = e._embedded?.venues?.[0];
  const lat = venue?.location?.latitude ? parseFloat(venue.location.latitude) : null;
  const lng = venue?.location?.longitude ? parseFloat(venue.location.longitude) : null;
  const price = e.priceRanges?.[0];
  const cls = e.classifications?.[0];
  const status = e.dates?.status?.code?.toLowerCase();
  return {
    sourceId: e.id,
    title: e.name,
    description: [e.description, e.info, e.pleaseNote].filter(Boolean).join('\n\n') || null,
    startsAt,
    endsAt,
    allDay,
    venueName: venue?.name ?? null,
    address: [venue?.address?.line1, venue?.city?.name].filter(Boolean).join(', ') || null,
    cityHint: venue?.city?.name ?? null,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    priceMin: price?.min ?? null,
    priceMax: price?.max ?? null,
    currency: price?.currency ?? 'ZAR',
    isFree: price ? price.max === 0 : null,
    ticketUrl: e.url ?? null,
    sourceUrl: e.url ?? null,
    imageUrl: pickImage(e.images),
    organiser: e.promoter?.name ?? null,
    categoryHints: [cls?.segment?.name, cls?.genre?.name, cls?.subGenre?.name].filter((x): x is string => !!x && x !== 'Undefined'),
    cancelled: status === 'cancelled',
  };
}

const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

export async function fetchTicketmaster(source: { city_slug: string | null; config: Record<string, unknown> }): Promise<ProviderResult> {
  if (!env.TICKETMASTER_API_KEY) throw new NeedsCredentialsError('TICKETMASTER_API_KEY');
  const city = getCity(source.city_slug);
  const radius = Number(source.config.radiusKm ?? 40);
  const days = Number(source.config.days ?? 120);
  const now = new Date();
  const events: ImportedEvent[] = [];
  let page = 0;
  let totalPages = 1;
  const maxPages = Number(source.config.maxPages ?? 5);
  while (page < totalPages && page < maxPages) {
    const url = new URL(BASE);
    url.searchParams.set('apikey', env.TICKETMASTER_API_KEY);
    url.searchParams.set('countryCode', 'ZA');
    if (city) {
      url.searchParams.set('geoPoint', geohash(city.lat, city.lng, 7));
      url.searchParams.set('radius', String(radius));
      url.searchParams.set('unit', 'km');
    }
    url.searchParams.set('startDateTime', iso(now));
    url.searchParams.set('endDateTime', iso(new Date(now.getTime() + days * 86_400_000)));
    url.searchParams.set('sort', 'date,asc');
    url.searchParams.set('size', '100');
    url.searchParams.set('page', String(page));
    const res = await fetch(url, { headers: { 'User-Agent': userAgent() }, signal: AbortSignal.timeout(20_000), cache: 'no-store' });
    if (res.status === 401 || res.status === 403) throw new Error('Ticketmaster rejected the API key (HTTP ' + res.status + ').');
    if (!res.ok) throw new Error(`Ticketmaster HTTP ${res.status}`);
    const data = (await res.json()) as { _embedded?: { events?: TmEvent[] }; page?: { totalPages?: number } };
    for (const e of data._embedded?.events ?? []) {
      const mapped = mapTicketmasterEvent(e);
      if (mapped) events.push(mapped);
    }
    totalPages = data.page?.totalPages ?? 0;
    page++;
    if (page < totalPages) await new Promise((r) => setTimeout(r, 250)); // stay under 5 requests/second
  }
  return { events, complete: page >= totalPages, note: `${events.length} events from Ticketmaster` };
}
