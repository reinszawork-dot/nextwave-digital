import { apiError, apiUser, json } from '@/server/api';
import { getPlace, osmUrl } from '@/server/places/service';

/** GET /api/places/:id — full details for the map's place sheet. */
export async function GET(_: Request, ctx: RouteContext<'/api/places/[id]'>) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const p = await getPlace(id, user.id);
  if (!p || (p.status !== 'published' && user.role !== 'admin')) return apiError(404, 'Place not found.');
  return json({
    id: p.id,
    name: p.name,
    category: p.category_slug,
    lat: p.lat,
    lng: p.lng,
    address: p.address,
    suburb: p.suburb,
    city: p.city,
    description: p.description,
    website: p.website,
    phone: p.phone,
    openingHours: p.opening_hours,
    tags: p.tags,
    featured: p.featured,
    featuredNote: p.featured_note,
    saved: !!p.saved_at,
    visited: !!p.visited_at,
    saves: p.saves,
    source: p.source,
    osmUrl: p.source === 'osm' ? osmUrl(p.source_id) : null,
  });
}
