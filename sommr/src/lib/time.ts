/**
 * Everything in SOMMR runs on South African Standard Time (UTC+2, no daylight
 * saving), regardless of where the server is. Day and week boundaries for
 * challenges, "today" and "this weekend" all use these helpers.
 */
export const SA_TZ = 'Africa/Johannesburg';
const OFFSET_MS = 2 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar parts of an instant, in South African time. */
export function saParts(date: Date = new Date()) {
  const d = new Date(date.getTime() + OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    /** 0 = Sunday … 6 = Saturday */
    weekday: d.getUTCDay(),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' for the South African calendar day containing `date`. */
export function dateKey(date: Date = new Date()): string {
  const p = saParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** The instant South African midnight starts on a given 'YYYY-MM-DD'. */
export function saMidnight(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - OFFSET_MS);
}

export function addDays(key: string, days: number): string {
  return dateKey(new Date(saMidnight(key).getTime() + days * DAY_MS + OFFSET_MS / 2));
}

/** Whole days from one date key to another (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((saMidnight(b).getTime() - saMidnight(a).getTime()) / DAY_MS);
}

/** ISO-8601 week key, e.g. '2026-W49', for the South African day containing `date`. */
export function weekKey(date: Date = new Date()): string {
  const p = saParts(date);
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return `${d.getUTCFullYear()}-W${pad(week)}`;
}

/** Monday and Sunday date keys of the week containing `date`. */
export function weekRange(date: Date = new Date()): { start: string; end: string } {
  const p = saParts(date);
  const today = dateKey(date);
  const sinceMonday = (p.weekday + 6) % 7;
  const start = addDays(today, -sinceMonday);
  return { start, end: addDays(start, 6) };
}

/** Days left in the week including today (Sunday = 1). */
export function daysLeftInWeek(date: Date = new Date()): number {
  const p = saParts(date);
  return 7 - ((p.weekday + 6) % 7);
}

export function greeting(date: Date = new Date()): string {
  const h = saParts(date).hour;
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 22) return 'Good evening';
  return 'Hello';
}

/**
 * Parse a date-time from a provider. Values with an explicit offset or 'Z' are
 * taken as-is; bare local times ('2026-12-05T18:00:00') are South African time.
 */
export function parseSaDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return saMidnight(v);
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(v)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const [, y, mo, d, h, mi, s] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0)) - OFFSET_MS);
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(opts);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-ZA', { timeZone: SA_TZ, ...opts });
    fmtCache.set(key, f);
  }
  return f;
}

/** 'Saturday, 21 November' */
export const formatLongDate = (d: Date) => fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(d);
/** 'Sat 21 Nov' */
export const formatShortDate = (d: Date) => fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(d);
/** '21 Nov 2026' */
export const formatDateWithYear = (d: Date) => fmt({ day: 'numeric', month: 'short', year: 'numeric' }).format(d);
/** '19:30' */
export const formatTime = (d: Date) => fmt({ hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
/** 'NOV' */
export const formatMonthShort = (d: Date) => fmt({ month: 'short' }).format(d).toUpperCase();
/** '21' */
export const formatDayNumber = (d: Date) => fmt({ day: 'numeric' }).format(d);
/** 'Sat' */
export const formatWeekday = (d: Date) => fmt({ weekday: 'short' }).format(d);

/** 'Today', 'Tomorrow' or 'Sat 21 Nov'. */
export function relativeDay(d: Date, now: Date = new Date()): string {
  const diff = daysBetween(dateKey(now), dateKey(d));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return formatShortDate(d);
}

/** '3 hours ago', 'yesterday', '12 Nov' — for "last updated" labels. */
export function timeAgo(d: Date, now: Date = new Date()): string {
  const s = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const days = Math.round(h / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDateWithYear(d);
}

/** Saturday and Sunday of the coming (or current) weekend. */
export function weekendRange(date: Date = new Date()): { start: string; end: string } {
  const p = saParts(date);
  const today = dateKey(date);
  if (p.weekday === 0) return { start: today, end: today };
  if (p.weekday === 6) return { start: today, end: addDays(today, 1) };
  const toSat = 6 - p.weekday;
  // Friday evening counts as the weekend in South Africa.
  const start = p.weekday === 5 ? today : addDays(today, toSat);
  return { start, end: addDays(today, toSat + 1) };
}

/** A Date as a `datetime-local` input value in South African time ('2026-12-05T18:00'). */
export function toSaLocalInput(d: Date | null | undefined): string {
  if (!d) return '';
  const p = saParts(d);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}
