import { timingSafeEqual } from 'node:crypto';
import { env } from '@/server/env';
import { runAllImports } from '@/server/events/importer';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

function authorised(req: Request): boolean {
  if (!env.CRON_SECRET) return false;
  const header = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${env.CRON_SECRET}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Daily event import. Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`
 * (see vercel.json). Imports every enabled source, archives finished events and
 * geocodes venues without coordinates.
 */
export async function GET(req: Request) {
  if (!env.CRON_SECRET) return Response.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 });
  if (!authorised(req)) return Response.json({ error: 'Unauthorised' }, { status: 401 });
  const result = await runAllImports('cron');
  return Response.json(result);
}
