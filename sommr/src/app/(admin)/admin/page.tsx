import Link from 'next/link';
import { AlertTriangle, CircleCheck, KeyRound, Plus } from 'lucide-react';
import { ActionButton } from '@/components/admin/ActionButton';
import { timeAgo } from '@/lib/time';
import { runAllImportsAction } from '@/server/actions/admin';
import { maybeOne, query, sql } from '@/server/db';
import { env } from '@/server/env';
import { nominatimFallbackEnabled } from '@/server/places/osm';

export default async function AdminOverview() {
  const counts = await maybeOne<Record<string, number>>(sql`
    select
      (select count(*) from users)::int as users,
      (select count(*) from users where created_at > now() - interval '7 days')::int as new_users,
      (select count(*) from events where status = 'published' and coalesce(ends_at, starts_at + interval '6 hours') >= now())::int as upcoming,
      (select count(*) from events where status = 'pending')::int as pending_events,
      (select count(*) from places where status = 'pending')::int as pending_places,
      (select count(*) from places where status = 'published')::int as places,
      (select count(*) from challenges where active)::int as challenges,
      (select count(*) from user_challenges where status = 'completed' and completed_at > now() - interval '7 days')::int as completions,
      (select count(*) from memories)::int as memories`);
  const sources = await query<{ id: string; name: string; kind: string; enabled: boolean; last_status: string | null; last_message: string | null; last_run_at: Date | null }>(sql`
    select id, name, kind, enabled, last_status, last_message, last_run_at from event_sources order by kind, name`);
  const c = counts ?? {};
  const config = [
    { label: 'Database', ok: !!env.DATABASE_URL, detail: env.DATABASE_URL ? 'PostgreSQL connected' : 'Using the local development database (PGlite)' },
    { label: 'Ticketmaster', ok: !!env.TICKETMASTER_API_KEY, detail: env.TICKETMASTER_API_KEY ? 'API key set' : 'Set TICKETMASTER_API_KEY to import Ticketmaster events' },
    { label: 'Quicket', ok: !!env.QUICKET_API_KEY, detail: env.QUICKET_API_KEY ? 'API key set' : 'Set QUICKET_API_KEY to import Quicket events' },
    { label: 'Scheduled imports', ok: !!env.CRON_SECRET, detail: env.CRON_SECRET ? 'CRON_SECRET set — runs daily on Vercel' : 'Set CRON_SECRET so the daily import can run' },
    { label: 'Password reset email', ok: !!env.RESEND_API_KEY, detail: env.RESEND_API_KEY ? 'Resend configured' : 'Set RESEND_API_KEY (links are only logged in development)' },
    { label: 'Photo storage', ok: true, detail: env.STORAGE_DRIVER === 'supabase' ? 'Supabase Storage' : 'Stored in the database' },
    { label: 'Places fallback', ok: true, detail: nominatimFallbackEnabled() ? 'Nominatim fallback on (light use only)' : 'Overpass only' },
  ];
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl">Overview</h1>
          <p className="mt-2 text-ink-3">Keep SOMMR’s places and events accurate and fresh.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton action={runAllImportsAction} className="btn btn-ghost">
            Run all imports now
          </ActionButton>
          <Link href="/admin/events/new" className="btn btn-primary">
            <Plus size={17} aria-hidden="true" /> Add event
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Upcoming events', c.upcoming, '/admin/events'],
          ['Awaiting review', (c.pending_events ?? 0) + (c.pending_places ?? 0), '/admin/submissions'],
          ['Published places', c.places, '/admin/places'],
          ['Active challenges', c.challenges, '/admin/challenges'],
          ['Members', c.users, '/admin/users'],
          ['New this week', c.new_users, '/admin/users'],
          ['Challenges done (7 days)', c.completions, null],
          ['Memories saved', c.memories, null],
        ].map(([label, value, href]) => {
          const inner = (
            <>
              <p className="eyebrow">{label as string}</p>
              <p className="display mt-1 text-4xl">{(value as number) ?? 0}</p>
            </>
          );
          return href ? (
            <Link key={label as string} href={href as string} className="card card-hover block px-5 py-4">
              {inner}
            </Link>
          ) : (
            <div key={label as string} className="card px-5 py-4">
              {inner}
            </div>
          );
        })}
      </div>

      <section>
        <h2 className="display mb-4 text-3xl">Event sources</h2>
        <ul className="card divide-y divide-line">
          {sources.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 text-sm">
              {s.last_status === 'ok' ? (
                <CircleCheck size={18} className="text-leaf" aria-label="OK" />
              ) : s.last_status === 'needs_credentials' ? (
                <KeyRound size={18} className="text-sun-deep" aria-label="Needs credentials" />
              ) : s.last_status ? (
                <AlertTriangle size={18} className="text-danger" aria-label="Error" />
              ) : (
                <span className="h-[18px] w-[18px] rounded-full border border-dashed border-line-strong" aria-label="Not run yet" />
              )}
              <span className="font-medium">{s.name}</span>
              {!s.enabled ? <span className="tag">Disabled</span> : null}
              <span className="min-w-0 flex-1 truncate text-ink-3">{s.last_message ?? 'Not run yet'}</span>
              <span className="text-xs text-ink-3">{s.last_run_at ? timeAgo(s.last_run_at) : ''}</span>
            </li>
          ))}
        </ul>
        <Link href="/admin/sources" className="mt-3 inline-block text-sm font-medium text-sea-deep hover:underline">
          Manage sources and import history →
        </Link>
      </section>

      <section>
        <h2 className="display mb-4 text-3xl">Configuration</h2>
        <ul className="card divide-y divide-line">
          {config.map((x) => (
            <li key={x.label} className="flex items-center gap-3 px-5 py-3.5 text-sm">
              {x.ok ? <CircleCheck size={18} className="text-leaf" aria-hidden="true" /> : <KeyRound size={18} className="text-sun-deep" aria-hidden="true" />}
              <span className="w-44 shrink-0 font-medium">{x.label}</span>
              <span className="text-ink-3">{x.detail}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
