import 'server-only';
import { parseSaDateTime } from '@/lib/time';
import { env, userAgent } from '../../env';
import { NeedsCredentialsError, type ImportedEvent, type ProviderResult } from '../types';

/**
 * Quicket public events API — https://docs.quicket.com
 * GET https://api.quicket.co.za/api/events?api_key=…&pageSize=&page=
 * Needs QUICKET_API_KEY (register at https://developer.quicket.co.za).
 */
const BASE = 'https://api.quicket.co.za/api/events';

export interface QuicketEvent {
  id: number;
  name: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  venue?: { name?: string; addressLine1?: string; addressLine2?: string; latitude?: number | string; longitude?: number | string };
  locality?: { levelOne?: string; levelTwo?: string; levelThree?: string };
  organiser?: { name?: string };
  categories?: { id: number; name: string }[];
  tickets?: { price?: number | string; soldOut?: boolean; donation?: boolean }[];
}

/** Quicket descriptions are HTML; keep readable text only. */
export function htmlToText(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<(br|\/p|\/div|\/li|\/h\d)\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&rsquo;/g, '’')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text ? text.slice(0, 5000) : null;
}

export function mapQuicketEvent(e: QuicketEvent): ImportedEvent | null {
  const startsAt = parseSaDateTime(e.startDate);
  if (!startsAt || !e.name) return null;
  const endsAt = parseSaDateTime(e.endDate);
  const lat = e.venue?.latitude != null ? Number(e.venue.latitude) : null;
  const lng = e.venue?.longitude != null ? Number(e.venue.longitude) : null;
  const validCoord = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  const prices = (e.tickets ?? [])
    .filter((t) => !t.donation)
    .map((t) => Number(t.price))
    .filter((p) => Number.isFinite(p) && p >= 0);
  const priceMin = prices.length ? Math.min(...prices) : null;
  const priceMax = prices.length ? Math.max(...prices) : null;
  const locality = [e.locality?.levelThree, e.locality?.levelTwo].filter(Boolean).join(', ');
  return {
    sourceId: String(e.id),
    title: e.name.trim(),
    description: htmlToText(e.description),
    startsAt,
    endsAt: endsAt && endsAt > startsAt ? endsAt : null,
    venueName: e.venue?.name ?? null,
    address: [e.venue?.addressLine1, e.venue?.addressLine2, locality].filter(Boolean).join(', ') || null,
    cityHint: e.locality?.levelTwo ?? e.locality?.levelThree ?? null,
    lat: validCoord ? lat : null,
    lng: validCoord ? lng : null,
    priceMin,
    priceMax,
    currency: 'ZAR',
    isFree: prices.length ? priceMax === 0 : null,
    ticketUrl: e.url ?? null,
    sourceUrl: e.url ?? null,
    imageUrl: e.imageUrl || null,
    organiser: e.organiser?.name ?? null,
    categoryHints: (e.categories ?? []).map((c) => c.name),
  };
}

export async function fetchQuicket(source: { config: Record<string, unknown> }): Promise<ProviderResult> {
  if (!env.QUICKET_API_KEY) throw new NeedsCredentialsError('QUICKET_API_KEY');
  const pageSize = Number(source.config.pageSize ?? 100);
  const maxPages = Number(source.config.maxPages ?? 20);
  const horizon = Date.now() + Number(source.config.days ?? 150) * 86_400_000;
  const events: ImportedEvent[] = [];
  let page = 1;
  let pages = 1;
  while (page <= pages && page <= maxPages) {
    const url = new URL(BASE);
    url.searchParams.set('api_key', env.QUICKET_API_KEY);
    url.searchParams.set('pageSize', String(pageSize));
    url.searchParams.set('page', String(page));
    const res = await fetch(url, { headers: { 'User-Agent': userAgent(), Accept: 'application/json' }, signal: AbortSignal.timeout(25_000), cache: 'no-store' });
    if (res.status === 401 || res.status === 403) throw new Error(`Quicket rejected the API key (HTTP ${res.status}).`);
    if (!res.ok) throw new Error(`Quicket HTTP ${res.status}`);
    const data = (await res.json()) as { results?: QuicketEvent[]; pages?: number };
    for (const e of data.results ?? []) {
      const mapped = mapQuicketEvent(e);
      if (mapped && mapped.startsAt.getTime() < horizon) events.push(mapped);
    }
    pages = Number(data.pages ?? 1);
    page++;
  }
  return { events, complete: false, note: `${events.length} events from ${page - 1} of ${pages} Quicket pages` };
}
