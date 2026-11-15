import { parseSaDateTime } from '@/lib/time';
import type { ImportedEvent } from '../types';

/**
 * Minimal iCalendar (RFC 5545) parser for public event feeds (.ics). Handles line
 * folding, escaping, TZID/UTC/floating times, all-day dates, GEO, URL and STATUS.
 * Recurring rules (RRULE) are not expanded: only each event's first date is used.
 */
interface Prop {
  name: string;
  params: Record<string, string>;
  value: string;
}

function unfold(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function parseLine(line: string): Prop | null {
  const colon = findValueColon(line);
  if (colon < 0) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [name, ...rawParams] = head.split(';');
  const params: Record<string, string> = {};
  for (const p of rawParams) {
    const eq = p.indexOf('=');
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name: name.toUpperCase(), params, value };
}

/** The first colon that isn't inside a quoted parameter value. */
function findValueColon(line: string): number {
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted;
    else if (line[i] === ':' && !quoted) return i;
  }
  return -1;
}

const unescape = (v: string) => v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1').trim();

/** Convert wall-clock time in an IANA zone to a UTC Date using the platform's time zone data. */
export function zonedTimeToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
    const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
    return new Date(guess - (asUtc - guess));
  } catch {
    return new Date(guess - 2 * 3_600_000); // unknown zone: assume South African time
  }
}

function parseIcalDate(p: Prop): { date: Date | null; allDay: boolean } {
  const v = p.value.trim();
  if (p.params.VALUE === 'DATE' || /^\d{8}$/.test(v)) {
    const iso = `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
    return { date: parseSaDateTime(iso), allDay: true };
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) return { date: null, allDay: false };
  const [, y, mo, d, h, mi, s, z] = m;
  if (z) return { date: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0))), allDay: false };
  const tz = p.params.TZID;
  if (tz && tz !== 'Africa/Johannesburg') return { date: zonedTimeToUtc(+y, +mo, +d, +h, +mi, +(s || 0), tz), allDay: false };
  return { date: parseSaDateTime(`${y}-${mo}-${d}T${h}:${mi}:${s || '00'}`), allDay: false };
}

export function parseIcal(text: string): ImportedEvent[] {
  const lines = unfold(text);
  const events: ImportedEvent[] = [];
  let cur: Prop[] | null = null;
  for (const line of lines) {
    if (/^BEGIN:VEVENT/i.test(line)) cur = [];
    else if (/^END:VEVENT/i.test(line)) {
      if (cur) {
        const ev = toEvent(cur);
        if (ev) events.push(ev);
      }
      cur = null;
    } else if (cur) {
      const p = parseLine(line);
      if (p) cur.push(p);
    }
  }
  return events;
}

function toEvent(props: Prop[]): ImportedEvent | null {
  const get = (n: string) => props.find((p) => p.name === n);
  const summary = get('SUMMARY');
  const dtstart = get('DTSTART');
  if (!summary || !dtstart) return null;
  const start = parseIcalDate(dtstart);
  if (!start.date) return null;
  const dtend = get('DTEND');
  let endsAt = dtend ? parseIcalDate(dtend).date : null;
  // All-day DTEND is exclusive (the next day); store the last moment of the final day instead.
  if (endsAt && start.allDay) endsAt = new Date(endsAt.getTime() - 60_000);
  const uid = get('UID')?.value || `${summary.value}|${dtstart.value}`;
  const recurrence = get('RECURRENCE-ID')?.value;
  const geo = get('GEO')?.value.split(/[;,]/).map(Number);
  const location = get('LOCATION') ? unescape(get('LOCATION')!.value) : null;
  const url = get('URL')?.value.trim() || null;
  const categories = props.filter((p) => p.name === 'CATEGORIES').flatMap((p) => unescape(p.value).split(','));
  return {
    sourceId: recurrence ? `${uid}#${recurrence}` : uid,
    title: unescape(summary.value).slice(0, 200),
    description: get('DESCRIPTION') ? unescape(get('DESCRIPTION')!.value).slice(0, 5000) : null,
    startsAt: start.date,
    endsAt: endsAt && endsAt > start.date ? endsAt : null,
    allDay: start.allDay,
    venueName: location?.split(',')[0]?.trim() || null,
    address: location,
    lat: geo && Number.isFinite(geo[0]) ? geo[0] : null,
    lng: geo && Number.isFinite(geo[1]) ? geo[1] : null,
    ticketUrl: url,
    sourceUrl: url,
    organiser: get('ORGANIZER')?.params.CN ?? null,
    categoryHints: categories.map((c) => c.trim()).filter(Boolean),
    cancelled: get('STATUS')?.value.toUpperCase() === 'CANCELLED',
  };
}
