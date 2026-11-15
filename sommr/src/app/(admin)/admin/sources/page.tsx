import type { Metadata } from 'next';
import { AlertTriangle, CircleCheck, KeyRound, Play, Trash2 } from 'lucide-react';
import { ActionButton } from '@/components/admin/ActionButton';
import { SourceForm } from '@/components/admin/SourceForm';
import { getCity } from '@/lib/cities';
import { formatShortDate, formatTime, timeAgo } from '@/lib/time';
import { deleteSourceAction, runAllImportsAction, runSourceAction, toggleSourceAction } from '@/server/actions/admin';
import { query, sql } from '@/server/db';
import { getCategories } from '@/server/services/categories';

export const metadata: Metadata = { title: 'Imports' };

const KIND: Record<string, string> = { ticketmaster: 'Ticketmaster API', quicket: 'Quicket API', ical: 'iCalendar feed', jsonld: 'Web page (schema.org)' };

export default async function SourcesPage() {
  const [sources, runs, categories] = await Promise.all([
    query<{ id: string; kind: string; name: string; url: string | null; city_slug: string | null; enabled: boolean; last_status: string | null; last_message: string | null; last_run_at: Date | null; events: number }>(sql`
      select s.*, (select count(*) from events e where e.source_ref = s.id and e.status = 'published' and e.starts_at > now())::int as events
      from event_sources s order by s.kind, s.name`),
    query<{ id: string; name: string | null; trigger: string; status: string; started_at: Date; created_count: number; updated_count: number; removed_count: number; message: string | null }>(sql`
      select r.*, s.name from import_runs r left join event_sources s on s.id = r.source_ref order by r.started_at desc limit 40`),
    getCategories('event'),
  ]);
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl">Imports</h1>
          <p className="mt-2 max-w-2xl text-ink-3">
            Events are imported daily from these sources. Changed events are updated, cancelled ones flagged, removed ones archived and finished ones hidden automatically. Your manual corrections are never overwritten.
          </p>
        </div>
        <ActionButton action={runAllImportsAction} className="btn btn-primary">
          <Play size={16} aria-hidden="true" /> Run all now
        </ActionButton>
      </div>

      <ul className="space-y-3">
        {sources.map((s) => (
          <li key={s.id} className="card p-5">
            <div className="flex flex-wrap items-start gap-3">
              {s.last_status === 'ok' ? (
                <CircleCheck size={20} className="mt-0.5 text-leaf" aria-label="Last run OK" />
              ) : s.last_status === 'needs_credentials' ? (
                <KeyRound size={20} className="mt-0.5 text-sun-deep" aria-label="Needs credentials" />
              ) : s.last_status ? (
                <AlertTriangle size={20} className="mt-0.5 text-danger" aria-label="Last run failed" />
              ) : (
                <span className="mt-0.5 h-5 w-5 rounded-full border border-dashed border-line-strong" aria-label="Not run yet" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {s.name} {!s.enabled ? <span className="tag ml-1">Disabled</span> : null}
                </p>
                <p className="text-xs text-ink-3">
                  {KIND[s.kind]}
                  {s.city_slug ? ` · ${getCity(s.city_slug)?.name}` : ''} · {s.events} upcoming events
                  {s.url ? (
                    <>
                      {' · '}
                      <a href={s.url} target="_blank" rel="noreferrer" className="underline">
                        {new URL(s.url).host}
                      </a>
                    </>
                  ) : null}
                </p>
                <p className="mt-1.5 text-sm text-ink-2">
                  {s.last_message ?? 'Not run yet.'} {s.last_run_at ? <span className="text-ink-3">({timeAgo(s.last_run_at)})</span> : null}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton action={runSourceAction.bind(null, s.id)}>
                  <Play size={14} aria-hidden="true" /> Run
                </ActionButton>
                <ActionButton action={toggleSourceAction.bind(null, s.id, !s.enabled)} success={s.enabled ? 'Source disabled' : 'Source enabled'}>
                  {s.enabled ? 'Disable' : 'Enable'}
                </ActionButton>
                {['ical', 'jsonld'].includes(s.kind) ? (
                  <ActionButton action={deleteSourceAction.bind(null, s.id)} className="btn btn-danger btn-sm" confirm="Remove this source? Its events stay until they finish." success="Source removed">
                    <Trash2 size={14} aria-hidden="true" />
                  </ActionButton>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <section className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <h2 className="display mb-2 text-3xl">Add a source</h2>
          <p className="mb-5 text-sm text-ink-3">
            Many venues, markets and municipalities publish a calendar feed (.ics) or event pages with schema.org data. Only add sources you trust and have permission to use.
          </p>
          <div className="card p-6">
            <SourceForm categories={categories.map((c) => ({ slug: c.slug, label: c.label }))} />
          </div>
        </div>
        <div>
          <h2 className="display mb-5 text-3xl">Recent runs</h2>
          {runs.length === 0 ? (
            <p className="text-sm text-ink-3">No imports have run yet.</p>
          ) : (
            <ul className="card divide-y divide-line text-sm">
              {runs.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`tag ${r.status === 'ok' ? 'tag-leaf' : r.status === 'needs_credentials' ? 'tag-sun' : r.status === 'running' ? '' : 'tag-danger'}`}>{r.status}</span>
                    <span className="truncate font-medium">{r.name ?? 'Archive & geocode'}</span>
                    <span className="ml-auto shrink-0 text-xs text-ink-3">
                      {formatShortDate(r.started_at)} {formatTime(r.started_at)} · {r.trigger}
                    </span>
                  </div>
                  {r.message ? <p className="mt-1 text-xs text-ink-3">{r.message}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
