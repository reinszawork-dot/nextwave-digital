import 'server-only';

/**
 * Server-side configuration. Everything here stays on the server: none of these
 * values are ever sent to the browser. See `.env.example` for documentation.
 */
function str(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export const env = {
  // DATABASE_URL, or POSTGRES_URL as set by Vercel's Neon / Supabase integrations.
  DATABASE_URL: str('DATABASE_URL') || str('POSTGRES_URL'),
  /** Public URL of the app, e.g. https://sommr.vercel.app — used in emails and as the Nominatim referer. */
  APP_URL:
    str('APP_URL') ||
    (str('VERCEL_PROJECT_PRODUCTION_URL') ? `https://${str('VERCEL_PROJECT_PRODUCTION_URL')}` : undefined) ||
    (str('VERCEL_URL') ? `https://${str('VERCEL_URL')}` : 'http://localhost:3000'),
  /** Comma separated emails that become admins when they register. */
  ADMIN_EMAILS: (str('ADMIN_EMAILS') || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  /** Shared secret for the scheduled import endpoint (Vercel Cron sends it as a Bearer token). */
  CRON_SECRET: str('CRON_SECRET'),

  // Event providers
  TICKETMASTER_API_KEY: str('TICKETMASTER_API_KEY'),
  QUICKET_API_KEY: str('QUICKET_API_KEY'),

  // Places, geocoding, weather (all keyless, open data)
  OVERPASS_URLS: (str('OVERPASS_URLS') ||
    'https://overpass-api.de/api/interpreter,https://overpass.private.coffee/api/interpreter,https://overpass.kumi.systems/api/interpreter')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean),
  NOMINATIM_URL: str('NOMINATIM_URL') || 'https://nominatim.openstreetmap.org',
  /** Optional contact address for the OSM Nominatim usage policy. */
  NOMINATIM_EMAIL: str('NOMINATIM_EMAIL'),
  WEATHER_URL: str('WEATHER_URL') || 'https://api.open-meteo.com/v1/forecast',

  // Photo storage: 'database' (default, zero config) or 'supabase'
  STORAGE_DRIVER: (str('STORAGE_DRIVER') || 'database') as 'database' | 'supabase',
  SUPABASE_URL: str('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: str('SUPABASE_SERVICE_ROLE_KEY'),
  SUPABASE_STORAGE_BUCKET: str('SUPABASE_STORAGE_BUCKET') || 'sommr-media',

  // Email (password reset). Without it, reset links are printed to the server log in development.
  RESEND_API_KEY: str('RESEND_API_KEY'),
  EMAIL_FROM: str('EMAIL_FROM') || 'SOMMR <hello@example.com>',

  isProduction: process.env.NODE_ENV === 'production',
};

/** A polite, generic User-Agent for open-data APIs (no personal details). */
export function userAgent(): string {
  return `SOMMR/0.1 (+${env.APP_URL})`;
}
