import { apiError, apiRateLimit, apiUser, json, num, placeDto } from '@/server/api';
import { ensureCells, cellsForBbox, MAX_SYNC_SPAN, placesInBbox } from '@/server/places/service';
import { getCategories } from '@/server/services/categories';
import { listEvents } from '@/server/events/service';

export const maxDuration = 60;

/**
 * GET /api/places?bbox=west,south,east,north&categories=a,b&q=
 * Real places inside the map view. Fresh OpenStreetMap data is fetched for the
 * visible area when it's zoomed in enough; wider views show what's cached.
 */
export async function GET(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const u = new URL(req.url);
  const parts = (u.searchParams.get('bbox') ?? '').split(',').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return apiError(400, 'Invalid bbox.');
  const [west, south, east, north] = parts;
  if (west >= east || south >= north) return apiError(400, 'Invalid bbox.');
  if (!(await apiRateLimit(user, 'places', 120, 60))) return apiError(429, 'Slow down a little and try again.');

  const placeCats = await getCategories('place');
  const requested = (u.searchParams.get('categories') ?? '').split(',').filter(Boolean);
  const chosen = placeCats.filter((c) => requested.length === 0 || requested.includes(c.slug));
  const osmCats = chosen.filter((c) => c.osm_filters.length > 0).map((c) => c.slug);
  const eventCats = [...new Set(chosen.flatMap((c) => c.event_categories))];
  const q = (u.searchParams.get('q') ?? '').trim().slice(0, 80) || undefined;
  const bbox = { west, south, east, north };

  const span = Math.max(east - west, north - south);
  let syncError: string | null = null;
  const zoomedOut = span > MAX_SYNC_SPAN;
  if (!zoomedOut && osmCats.length) {
    const centerLat = (south + north) / 2;
    const centerLng = (west + east) / 2;
    const cells = cellsForBbox(bbox).sort((a, b) => {
      const d = (k: string) => {
        const [la, lo] = k.split(':').map(Number);
        return (la + 0.05 - centerLat) ** 2 + (lo + 0.05 - centerLng) ** 2;
      };
      return d(a) - d(b);
    });
    syncError = (await ensureCells(cells, osmCats)).error ?? null;
  }
  const [places, events] = await Promise.all([
    osmCats.length || chosen.some((c) => c.osm_filters.length === 0 && c.event_categories.length === 0)
      ? placesInBbox({ bbox, categories: chosen.map((c) => c.slug), userId: user.id, q, limit: 500 })
      : Promise.resolve([]),
    eventCats.length
      ? listEvents({ categories: eventCats, withCoords: true, when: 'month', q, limit: 200 }, user.id).then((evs) =>
          evs.filter((e) => e.lat! >= south && e.lat! <= north && e.lng! >= west && e.lng! <= east),
        )
      : Promise.resolve([]),
  ]);
  return json({
    places: places.map(placeDto),
    events: events.map((e) => ({ id: e.id, title: e.title, lat: e.lat, lng: e.lng, category: e.category_slug, startsAt: e.starts_at, venue: e.venue_name })),
    zoomedOut,
    error: syncError,
  });
}
