import { addDays, dateKey, daysBetween, saMidnight, saParts } from './time';

/**
 * The South African summer: 1 December to the end of February (the standard
 * meteorological season, which also covers the December holidays).
 */
export interface SeasonState {
  phase: 'before' | 'during';
  start: string;
  end: string;
  /** Days until 1 December (before) — 0 during summer. */
  daysUntil: number;
  /** 1-based day of summer (during) — 0 before. */
  day: number;
  totalDays: number;
  daysLeft: number;
  /** 0–1 through the season. */
  progress: number;
}

function isLeap(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function seasonState(now: Date = new Date()): SeasonState {
  const p = saParts(now);
  const today = dateKey(now);
  const startYear = p.month === 12 ? p.year : p.month <= 2 ? p.year - 1 : p.year;
  const start = `${startYear}-12-01`;
  const end = `${startYear + 1}-02-${isLeap(startYear + 1) ? 29 : 28}`;
  const totalDays = daysBetween(start, end) + 1;
  if (today < start) {
    return { phase: 'before', start, end, daysUntil: daysBetween(today, start), day: 0, totalDays, daysLeft: totalDays, progress: 0 };
  }
  const day = daysBetween(start, today) + 1;
  return {
    phase: 'during',
    start,
    end,
    daysUntil: 0,
    day,
    totalDays,
    daysLeft: totalDays - day,
    progress: Math.min(1, day / totalDays),
  };
}

/** Fixed-date public holidays and festive milestones of the South African summer. */
const MILESTONES = [
  { month: 12, day: 1, label: 'Summer starts' },
  { month: 12, day: 16, label: 'Day of Reconciliation' },
  { month: 12, day: 25, label: 'Christmas Day' },
  { month: 12, day: 26, label: 'Day of Goodwill' },
  { month: 12, day: 31, label: 'New Year’s Eve' },
  { month: 1, day: 1, label: 'New Year’s Day' },
];

export function nextMilestone(now: Date = new Date()): { label: string; key: string; days: number } | null {
  const today = dateKey(now);
  const year = saParts(now).year;
  const candidates = [year, year + 1].flatMap((y) =>
    MILESTONES.map((m) => ({
      label: m.label,
      key: `${y}-${String(m.month).padStart(2, '0')}-${String(m.day).padStart(2, '0')}`,
    })),
  );
  const upcoming = candidates
    .filter((c) => c.key >= today)
    .sort((a, b) => (a.key < b.key ? -1 : 1))[0];
  if (!upcoming) return null;
  const days = daysBetween(today, upcoming.key);
  // Only surface milestones that fall in, or just before, the summer.
  if (days > 60) return null;
  return { ...upcoming, days };
}

export { addDays, saMidnight };
