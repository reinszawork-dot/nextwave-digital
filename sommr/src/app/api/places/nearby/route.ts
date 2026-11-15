import { apiError, apiRateLimit, apiUser, json, num, placeDto } from '@/server/api';
import { nearbyPlaces } from '@/server/places/service';
import { getCategories } from '@/server/services/categories';

export const maxDuration = 60;

/** GET /api/places/nearby?lat=&lng=&categories=a,b&limit=8&radius=12 */
export async function GET(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const u = new URL(req.url);
  const lat = num(u.searchParams.get('lat'));
  const lng = num(u.searchParams.get('lng'));
  if (lat == null || lng == null || lat < -35.5 || lat > -21 || lng < 16 || lng > 33.5) {
    return apiError(400, 'A location in South Africa is required.');
  }
  if (!(await apiRateLimit(user, 'nearby', 60, 60))) return apiError(429, 'Slow down a little and try again.');
  const known = new Set((await getCategories('place')).map((c) => c.slug));
  const categories = (u.searchParams.get('categories') ?? '').split(',').filter((c) => known.has(c));
  if (!categories.length) return apiError(400, 'Choose at least one category.');
  const limit = Math.min(24, Math.max(1, num(u.searchParams.get('limit')) ?? 8));
  const radiusKm = Math.min(25, Math.max(1, num(u.searchParams.get('radius')) ?? 12));
  const { places, error } = await nearbyPlaces({ lat, lng, categories, userId: user.id, limit, radiusKm });
  return json({ places: places.map(placeDto), error: error ?? null });
}
