import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Star } from 'lucide-react';
import { getCity } from '@/lib/cities';
import { formatShortDate, formatTime } from '@/lib/time';
import { query, sql } from '@/server/db';

export const metadata: Metadata = { title: 'Events' };

const STATUS_TONE: Record<string, string> = { published: 'tag-leaf', pending: 'tag-sun', cancelled: 'tag-danger', rejected: 'tag-danger', archived: '' };

export default async function AdminEvents({ searchParams }: PageProps<'/admin/events'>) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const status = typeof sp.status === 'string' ? sp.status : 'current';
  const source = typeof sp.source === 'string' ? sp.source : '';
  const like = '%' + q.replace(/[%_\\]/g, '\\$&') + '%';
  const rows = await query<{
    id: string; title: string; starts_at: Date; venue_name: string | null; city_slug: string | null; status: string; source: string;
    featured: boolean; locked_fields: string[]; category_slug: string;
  }>(sql`
    select id, title, starts_at, venue_name, city_slug, status, source, featured, locked_fields, category_slug from events
    where ${sql.and([
      q ? sql`(title ilike ${like} or venue_name ilike ${like})` : null,
      status === 'current' ? sql`status in ('published', 'pending') and coalesce(ends_at, starts_at + interval '6 hours') >= now()` : status !== 'all' ? sql`status = ${status}` : null,
      source ? sql`source = ${source}` : null,
    ])}
    order by ${status === 'archived' ? sql`starts_at desc` : sql`starts_at`}
    limit 200`);
  const tab = (value: string, label: string) => (
    <Link key={value} href={`/admin/events?status=${value}${q ? `&q=${encodeURIComponent(q)}` : ''}`} className="chip" aria-current={status === value ? 'page' : undefined}>
      {label}
    </Link>
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-5xl">Events</h1>
        <Link href="/admin/events/new" className="btn btn-primary">
          <Plus size={17} aria-hidden="true" /> Add event
        </Link>
      </div>
      <form className="flex flex-wrap gap-2" role="search">
        <input type="hidden" name="status" value={status} />
        <input name="q" defaultValue={q} placeholder="Search title or venue" className="input !h-10 max-w-sm !rounded-full" aria-label="Search events" />
        <select name="source" defaultValue={source} className="select !h-10 !w-auto !rounded-full" aria-label="Source">
          <option value="">All sources</option>
          {['admin', 'community', 'ticketmaster', 'quicket', 'ical', 'jsonld'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="btn btn-ghost btn-sm !h-10">Filter</button>
      </form>
      <div className="scroller !gap-2">
        {tab('current', 'Upcoming')}
        {tab('pending', 'Pending')}
        {tab('cancelled', 'Cancelled')}
        {tab('rejected', 'Rejected')}
        {tab('archived', 'Archived')}
        {tab('all', 'All')}
      </div>
      {rows.length === 0 ? (
        <p className="card px-5 py-10 text-center text-ink-3">No events match.</p>
      ) : (
        <ul className="card divide-y divide-line">
          {rows.map((e) => (
            <li key={e.id}>
              <Link href={`/admin/events/${e.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-sand/50">
                <span className="w-32 shrink-0 text-sm text-ink-3">
                  {formatShortDate(e.starts_at)} · {formatTime(e.starts_at)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    {e.featured ? <Star size={14} className="fill-sun text-sun" aria-label="Featured" /> : null}
                    <span className="truncate">{e.title}</span>
                  </span>
                  <span className="block truncate text-xs text-ink-3">
                    {[e.venue_name, getCity(e.city_slug)?.name, e.category_slug].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="tag">{e.source}</span>
                {e.locked_fields.length ? <span className="tag tag-sea">corrected</span> : null}
                <span className={`tag ${STATUS_TONE[e.status] ?? ''}`}>{e.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
