import { describe, expect, it } from 'vitest';
import { addDays, dateKey, daysBetween, parseSaDateTime, saMidnight, toSaLocalInput, weekKey, weekRange } from '@/lib/time';
import { nextMilestone, seasonState } from '@/lib/season';
import { sunTimes } from '@/lib/sun';
import { dateWindow } from '@/server/events/service';

describe('South African time', () => {
  it('uses SAST (UTC+2) for calendar days', () => {
    expect(dateKey(new Date('2026-12-01T21:59:00Z'))).toBe('2026-12-01');
    expect(dateKey(new Date('2026-12-01T22:00:00Z'))).toBe('2026-12-02');
    expect(saMidnight('2026-12-02').toISOString()).toBe('2026-12-01T22:00:00.000Z');
  });

  it('adds days and counts between dates across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
    expect(daysBetween('2026-11-15', '2026-12-01')).toBe(16);
  });

  it('computes ISO weeks and week ranges', () => {
    expect(weekKey(new Date('2026-12-28T10:00:00Z'))).toBe('2026-W53');
    expect(weekKey(new Date('2027-01-04T10:00:00Z'))).toBe('2027-W01');
    expect(weekRange(new Date('2026-11-15T10:00:00Z'))).toEqual({ start: '2026-11-09', end: '2026-11-15' });
  });

  it('parses provider date-times, treating bare times as SAST', () => {
    expect(parseSaDateTime('2026-12-05T18:00:00')!.toISOString()).toBe('2026-12-05T16:00:00.000Z');
    expect(parseSaDateTime('2026-12-05T18:00:00Z')!.toISOString()).toBe('2026-12-05T18:00:00.000Z');
    expect(parseSaDateTime('2026-12-05T18:00:00+01:00')!.toISOString()).toBe('2026-12-05T17:00:00.000Z');
    expect(parseSaDateTime('2026-12-05')!.toISOString()).toBe('2026-12-04T22:00:00.000Z');
    expect(parseSaDateTime('not a date')).toBeNull();
    expect(toSaLocalInput(new Date('2026-12-05T16:00:00Z'))).toBe('2026-12-05T18:00');
  });

  it('builds date windows for event filters', () => {
    const fri = new Date('2026-12-04T08:00:00Z'); // Friday 10:00 SAST
    const w = dateWindow('weekend', fri);
    expect(w.from.toISOString()).toBe('2026-12-04T15:00:00.000Z'); // Fri 17:00
    expect(w.to.toISOString()).toBe('2026-12-06T22:00:00.000Z'); // Sun midnight
    const today = dateWindow('today', fri);
    expect(today.from).toEqual(fri);
    expect(today.to.toISOString()).toBe('2026-12-04T22:00:00.000Z');
    const sun = dateWindow('weekend', new Date('2026-12-06T08:00:00Z'));
    expect(sun.to.toISOString()).toBe('2026-12-06T22:00:00.000Z');
  });
});

describe('season', () => {
  it('counts down to 1 December', () => {
    const s = seasonState(new Date('2026-11-15T08:00:00Z'));
    expect(s).toMatchObject({ phase: 'before', daysUntil: 16, start: '2026-12-01', end: '2027-02-28', totalDays: 90 });
  });
  it('tracks progress during summer, including leap years', () => {
    const s = seasonState(new Date('2028-01-15T08:00:00Z'));
    expect(s.phase).toBe('during');
    expect(s.end).toBe('2028-02-29');
    expect(s.day).toBe(46);
    expect(s.totalDays).toBe(91);
  });
  it('finds the next milestone', () => {
    expect(nextMilestone(new Date('2026-12-20T08:00:00Z'))).toMatchObject({ label: 'Christmas Day', days: 5 });
    expect(nextMilestone(new Date('2026-06-01T08:00:00Z'))).toBeNull();
  });
});

describe('sun times', () => {
  it('gives plausible summer sunsets for Cape Town and Johannesburg', () => {
    const fmt = (d: Date) => d.toLocaleTimeString('en-ZA', { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit', hour12: false });
    const ct = sunTimes('2026-12-21', -33.9249, 18.4241);
    const jhb = sunTimes('2026-12-21', -26.2041, 28.0473);
    // Published almanac values: Cape Town ~19:57, Johannesburg ~19:00 around the solstice.
    expect(fmt(ct.sunset) >= '19:52' && fmt(ct.sunset) <= '20:02').toBe(true);
    expect(fmt(jhb.sunset) >= '18:55' && fmt(jhb.sunset) <= '19:05').toBe(true);
    expect(ct.sunrise < ct.goldenHour && ct.goldenHour < ct.sunset).toBe(true);
  });
});
