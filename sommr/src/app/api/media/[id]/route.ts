import { apiError, apiUser } from '@/server/api';
import { readImage } from '@/server/media';

/** GET /api/media/:id?size=thumb — a user's own photo. Photos are private. */
export async function GET(req: Request, ctx: RouteContext<'/api/media/[id]'>) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const size = new URL(req.url).searchParams.get('size') === 'thumb' ? 'thumb' : 'full';
  const data = await readImage(id, user.id, size);
  if (!data) return apiError(404, 'Photo not found.');
  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(data.length),
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
