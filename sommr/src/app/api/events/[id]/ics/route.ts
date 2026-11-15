import { buildIcs } from '@/lib/ics';
import { apiError, apiUser } from '@/server/api';
import { env } from '@/server/env';
import { getEvent } from '@/server/events/service';

/** GET /api/events/:id/ics — download the event for any calendar app. */
export async function GET(_: Request, ctx: RouteContext<'/api/events/[id]/ics'>) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const e = await getEvent(id, user.id);
  if (!e || !['published', 'cancelled', 'archived'].includes(e.status)) return apiError(404, 'Event not found.');
  const body = buildIcs({
    id: e.id,
    title: e.status === 'cancelled' ? `CANCELLED: ${e.title}` : e.title,
    description: [e.description, e.ticket_url ? `Tickets: ${e.ticket_url}` : null, `${env.APP_URL}/events/${e.id}`].filter(Boolean).join('\n\n'),
    start: e.starts_at,
    end: e.ends_at,
    allDay: e.all_day,
    location: [e.venue_name, e.address].filter(Boolean).join(', ') || null,
    url: `${env.APP_URL}/events/${e.id}`,
  });
  const filename = e.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60) || 'event';
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.ics"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
