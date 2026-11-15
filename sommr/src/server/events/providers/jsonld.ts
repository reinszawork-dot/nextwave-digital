import { parseSaDateTime } from '@/lib/time';
import type { ImportedEvent } from '../types';
import { htmlToText } from './quicket';

/**
 * schema.org Event data embedded in web pages as JSON-LD — most ticketing sites
 * and venue "what's on" pages publish it for search engines. Handles single
 * events, @graph, ItemList and arrays.
 */
type Json = Record<string, unknown>;

const EVENT_TYPES = /Event$|^Festival$|^CourseInstance$/;

export function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = m[1].trim().replace(/^<!--|-->$/g, '');
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // Some sites emit invalid JSON-LD; skip it rather than guess.
    }
  }
  return blocks;
}

function types(node: Json): string[] {
  const t = node['@type'];
  return (Array.isArray(t) ? t : [t]).filter((x): x is string => typeof x === 'string');
}

function collectEvents(node: unknown, out: Json[], depth = 0) {
  if (!node || depth > 6) return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectEvents(n, out, depth + 1));
    return;
  }
  if (typeof node !== 'object') return;
  const obj = node as Json;
  if (types(obj).some((t) => EVENT_TYPES.test(t))) out.push(obj);
  if (obj['@graph']) collectEvents(obj['@graph'], out, depth + 1);
  if (obj.itemListElement) collectEvents(obj.itemListElement, out, depth + 1);
  if (obj.item && typeof obj.item === 'object') collectEvents(obj.item, out, depth + 1);
  if (obj.subEvent) collectEvents(obj.subEvent, out, depth + 1);
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : null);
const first = (v: unknown): unknown => (Array.isArray(v) ? v[0] : v);
/** Prices like "R120", "120.00" or 120. */
const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v.replace(/[^0-9.-]/g, '')) : NaN;
  return Number.isFinite(n) ? n : null;
};
/** Coordinates keep their sign — every South African latitude is negative. */
const coord = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v.trim()) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

function absolute(url: string | null, base: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url, base);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export function mapJsonLdEvent(e: Json, pageUrl: string): ImportedEvent | null {
  const title = str(e.name);
  const startsAt = parseSaDateTime(str(e.startDate));
  if (!title || !startsAt) return null;
  const endsAt = parseSaDateTime(str(e.endDate));
  const loc = first(e.location) as Json | string | undefined;
  let venueName: string | null = null;
  let address: string | null = null;
  let cityHint: string | null = null;
  let lat: number | null = null;
  let lng: number | null = null;
  if (typeof loc === 'string') {
    address = loc;
  } else if (loc && typeof loc === 'object') {
    venueName = str(loc.name);
    const addr = first(loc.address);
    if (typeof addr === 'string') address = addr;
    else if (addr && typeof addr === 'object') {
      const a = addr as Json;
      cityHint = str(a.addressLocality);
      address = [str(a.streetAddress), str(a.addressLocality), str(a.addressRegion)].filter(Boolean).join(', ') || null;
    }
    const geo = loc.geo as Json | undefined;
    if (geo) {
      lat = coord(geo.latitude, -90, 90);
      lng = coord(geo.longitude, -180, 180);
    }
  }
  const offers = (Array.isArray(e.offers) ? e.offers : e.offers ? [e.offers] : []) as Json[];
  const prices = offers.flatMap((o) => [num(o.price), num(o.lowPrice), num(o.highPrice)]).filter((p): p is number => p != null);
  const currency = str(offers[0]?.priceCurrency) ?? 'ZAR';
  const image = first(e.image);
  const imageUrl = typeof image === 'string' ? image : image && typeof image === 'object' ? str((image as Json).url) : null;
  const url = absolute(str(e.url), pageUrl) ?? pageUrl;
  const ticketUrl = absolute(str(offers[0]?.url), pageUrl) ?? url;
  const organiser = first(e.organizer) as Json | string | undefined;
  const status = str(e.eventStatus) ?? '';
  const id = str(e['@id']);
  return {
    sourceId: id && !id.startsWith('_:') ? id : `${url}#${startsAt.toISOString()}`,
    title: title.slice(0, 200),
    description: htmlToText(str(e.description)),
    startsAt,
    endsAt: endsAt && endsAt > startsAt ? endsAt : null,
    allDay: /^\d{4}-\d{2}-\d{2}$/.test(str(e.startDate) ?? ''),
    venueName,
    address,
    cityHint,
    lat,
    lng,
    priceMin: prices.length ? Math.min(...prices) : null,
    priceMax: prices.length ? Math.max(...prices) : null,
    currency,
    isFree: str(e.isAccessibleForFree) === 'true' || e.isAccessibleForFree === true ? true : prices.length ? Math.max(...prices) === 0 : null,
    ticketUrl,
    sourceUrl: url,
    imageUrl: absolute(imageUrl, pageUrl),
    organiser: typeof organiser === 'string' ? organiser : organiser ? str(organiser.name) : null,
    categoryHints: types(e),
    cancelled: /EventCancelled/i.test(status),
  };
}

export function parseJsonLdEvents(html: string, pageUrl: string): ImportedEvent[] {
  const nodes: Json[] = [];
  for (const block of extractJsonLdBlocks(html)) collectEvents(block, nodes);
  const seen = new Set<string>();
  const out: ImportedEvent[] = [];
  for (const n of nodes) {
    const ev = mapJsonLdEvent(n, pageUrl);
    if (ev && !seen.has(ev.sourceId)) {
      seen.add(ev.sourceId);
      out.push(ev);
    }
  }
  return out;
}
