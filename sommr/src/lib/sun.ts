/**
 * Sunrise and sunset times, calculated locally from the date and coordinates
 * (adapted from the public-domain NOAA / SunCalc formulas). No API needed.
 */
import { saMidnight } from './time';

const rad = Math.PI / 180;
const dayMs = 86_400_000;
const J1970 = 2_440_588;
const J2000 = 2_451_545;
const e = rad * 23.4397;
const J0 = 0.0009;

const toJulian = (d: Date) => d.valueOf() / dayMs - 0.5 + J1970;
const fromJulian = (j: number) => new Date((j + 0.5 - J1970) * dayMs);
const toDays = (d: Date) => toJulian(d) - J2000;
const solarMeanAnomaly = (d: number) => rad * (357.5291 + 0.98560028 * d);
function eclipticLongitude(M: number) {
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  return M + C + rad * 102.9372 + Math.PI;
}
const declination = (l: number) => Math.asin(Math.sin(e) * Math.sin(l));
const julianCycle = (d: number, lw: number) => Math.round(d - J0 - lw / (2 * Math.PI));
const approxTransit = (Ht: number, lw: number, n: number) => J0 + (Ht + lw) / (2 * Math.PI) + n;
const solarTransitJ = (ds: number, M: number, L: number) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
const hourAngle = (h: number, phi: number, d: number) =>
  Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)));

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
  /** Start of the evening golden hour (sun 6° above the horizon). */
  goldenHour: Date;
}

/** Sun times for a South African calendar day ('YYYY-MM-DD') at a location. */
export function sunTimes(day: string, lat: number, lng: number): SunTimes {
  const noon = new Date(saMidnight(day).getTime() + 12 * 3_600_000);
  const lw = rad * -lng;
  const phi = rad * lat;
  const d = toDays(noon);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L);
  const Jnoon = solarTransitJ(ds, M, L);
  const setFor = (h: number) => solarTransitJ(approxTransit(hourAngle(h, phi, dec), lw, n), M, L);
  const Jset = setFor(-0.833 * rad);
  const Jgolden = setFor(6 * rad);
  return {
    sunrise: fromJulian(Jnoon - (Jset - Jnoon)),
    sunset: fromJulian(Jset),
    goldenHour: fromJulian(Jgolden),
  };
}
