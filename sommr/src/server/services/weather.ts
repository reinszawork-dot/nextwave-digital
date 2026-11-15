import 'server-only';
import { env, userAgent } from '../env';

/**
 * Live weather from Open-Meteo (https://open-meteo.com) — free and keyless.
 * Cached for 30 minutes per location. Returns null if the service is unreachable,
 * so the dashboard simply hides the weather line.
 */
export interface Weather {
  temperature: number;
  code: number;
  max: number;
  min: number;
  uvMax: number | null;
  rainChance: number | null;
  windKmh: number | null;
}

const cache = new Map<string, { at: number; value: Weather | null }>();

export async function getWeather(lat: number, lng: number): Promise<Weather | null> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 30 * 60_000) return hit.value;
  const url = new URL(env.WEATHER_URL);
  url.searchParams.set('latitude', lat.toFixed(3));
  url.searchParams.set('longitude', lng.toFixed(3));
  url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m');
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max');
  url.searchParams.set('timezone', 'Africa/Johannesburg');
  url.searchParams.set('forecast_days', '1');
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': userAgent() },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 1800 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    const value: Weather = {
      temperature: Math.round(d.current.temperature_2m),
      code: d.current.weather_code,
      windKmh: d.current.wind_speed_10m != null ? Math.round(d.current.wind_speed_10m) : null,
      max: Math.round(d.daily.temperature_2m_max[0]),
      min: Math.round(d.daily.temperature_2m_min[0]),
      uvMax: d.daily.uv_index_max?.[0] ?? null,
      rainChance: d.daily.precipitation_probability_max?.[0] ?? null,
    };
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch (err) {
    console.warn('[weather] unavailable:', (err as Error).message);
    cache.set(key, { at: Date.now() - 25 * 60_000, value: null }); // retry in ~5 minutes
    return null;
  }
}

/** WMO weather codes → short, friendly descriptions. */
export function describeWeather(code: number): { label: string; kind: 'clear' | 'cloud' | 'rain' | 'storm' | 'fog' } {
  if (code === 0) return { label: 'clear skies', kind: 'clear' };
  if (code === 1) return { label: 'mostly sunny', kind: 'clear' };
  if (code === 2) return { label: 'partly cloudy', kind: 'cloud' };
  if (code === 3) return { label: 'overcast', kind: 'cloud' };
  if (code === 45 || code === 48) return { label: 'misty', kind: 'fog' };
  if (code >= 51 && code <= 57) return { label: 'drizzle', kind: 'rain' };
  if (code >= 61 && code <= 67) return { label: 'rain', kind: 'rain' };
  if (code >= 80 && code <= 82) return { label: 'showers', kind: 'rain' };
  if (code >= 95) return { label: 'thunderstorms', kind: 'storm' };
  return { label: 'mixed weather', kind: 'cloud' };
}

/** A one-line, honest nudge based on the forecast. */
export function weatherNudge(w: Weather): string | null {
  if (w.code >= 95) return 'Storms about — an indoor plan might be wise this afternoon.';
  if ((w.rainChance ?? 0) >= 60) return 'Rain is likely, so keep an umbrella handy.';
  if ((w.uvMax ?? 0) >= 8) return `UV peaks at ${Math.round(w.uvMax!)} — sunscreen, hat and shade at midday.`;
  if (w.max >= 30) return 'A hot one. Swim early, braai late.';
  if (w.code <= 1 && w.max >= 22) return 'Perfect for being outside.';
  return null;
}
