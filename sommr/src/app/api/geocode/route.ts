import { apiError, apiRateLimit, apiUser, json } from '@/server/api';
import { searchLocations } from '@/server/geocode';
import { CITIES } from '@/lib/cities';

/** GET /api/geocode?q= — find a town, suburb or landmark in South Africa. */
export async function GET(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
  if (q.length < 2) return json({ results: [] });
  // Instant answers for our listed cities; only unknown places go to the geocoder.
  const local = CITIES.filter((c) => c.name.toLowerCase().startsWith(q.toLowerCase())).map((c) => ({
    label: `${c.name}, ${c.province}`,
    lat: c.lat,
    lng: c.lng,
    type: 'city',
    bbox: null,
  }));
  if (local.length) return json({ results: local });
  if (!(await apiRateLimit(user, 'geocode', 30, 60))) return apiError(429, 'Too many searches — try again in a minute.');
  try {
    return json({ results: await searchLocations(q) });
  } catch {
    return apiError(503, 'Location search is unavailable right now.');
  }
}
