/** Shared helpers for the hand-built SVG charts. Used at build time and in the browser. */

export interface Unit {
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

/** Formats a number with space-grouped thousands (South African style) and a dot decimal. */
export function formatValue(v: number, unit: Unit = {}): string {
  const d = unit.decimals ?? 0;
  const [int, dec] = Math.abs(v).toFixed(d).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const sign = v < 0 ? '−' : '';
  return `${sign}${unit.prefix ?? ''}${grouped}${dec ? '.' + dec : ''}${unit.suffix ?? ''}`;
}

/** Rounds a maximum up to a "nice" axis value (1, 2, 2.5, 5 × 10^n). */
export function niceMax(max: number): number {
  if (max <= 0) return 1;
  const exp = Math.floor(Math.log10(max));
  const base = 10 ** exp;
  const f = max / base;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * base;
}

/** Monotone cubic interpolation (Fritsch–Carlson) → smooth SVG path that never overshoots. */
export function smoothPath(pts: [number, number][]): string {
  const n = pts.length;
  if (n < 2) return '';
  if (n === 2) return `M${pts[0][0]},${pts[0][1]}L${pts[1][0]},${pts[1][1]}`;
  const dx: number[] = [], dy: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    dy[i] = pts[i + 1][1] - pts[i][1];
    m[i] = dy[i] / dx[i];
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
  }
  t[n - 1] = m[n - 2];
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${(pts[i][0] + h).toFixed(2)},${(pts[i][1] + h * t[i]).toFixed(2)} ${(pts[i + 1][0] - h).toFixed(2)},${(pts[i + 1][1] - h * t[i + 1]).toFixed(2)} ${pts[i + 1][0].toFixed(2)},${pts[i + 1][1].toFixed(2)}`;
  }
  return d;
}

let uid = 0;
/** Deterministic ids for SVG gradients within one build. */
export const nextId = (prefix: string) => `${prefix}-${++uid}`;
