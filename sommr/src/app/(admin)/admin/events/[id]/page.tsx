import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, Trash2 } from 'lucide-react';
import { ActionButton } from '@/components/admin/ActionButton';
import { EventForm } from '@/components/admin/EventForm';
import { timeAgo, toSaLocalInput } from '@/lib/time';
import { deleteEventAction } from '@/server/actions/admin';
import { maybeOne, sql } from '@/server/db';
import { getCategories } from '@/server/services/categories';

export const metadata: Metadata = { title: 'Edit event' };

export default async function EditEventPage({ params, searchParams }: PageProps<'/admin/events/[id]'>) {
  const { id } = await params;
  const { saved } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const e = await maybeOne<Record<string, unknown> & {
    id: string; source: string; title: string; locked_fields: string[]; starts_at: Date; ends_at: Date | null; last_seen_at: Date | null;
    source_url: string | null; submitted_by_email: string | null; source_name: string | null; review_note: string | null;
  }>(sql`
    select e.*, u.email as submitted_by_email, s.name as source_name from events e
    left join users u on u.id = e.submitted_by left join event_sources s on s.id = e.source_ref where e.id = ${id}`);
  if (!e) notFound();
  const categories = await getCategories('event');
  const str = (k: string) => (e[k] == null ? '' : String(e[k]));
  const manual = ['admin', 'community'].includes(e.source);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="display text-5xl">Edit event</h1>
        <Link href={`/events/${e.id}`} className="btn btn-ghost btn-sm">
          <ExternalLink size={15} aria-hidden="true" /> View
        </Link>
      </div>
      <p className="mb-8 text-sm text-ink-3">
        Source: <strong>{e.source_name ?? e.source}</strong>
        {e.submitted_by_email ? ` · submitted by ${e.submitted_by_email}` : ''}
        {e.last_seen_at && !manual ? ` · last seen in the feed ${timeAgo(e.last_seen_at)}` : ''}
        {e.source_url ? (
          <>
            {' · '}
            <a href={e.source_url} target="_blank" rel="noreferrer" className="link">
              original listing
            </a>
          </>
        ) : null}
        {e.review_note ? ` · note: ${e.review_note}` : ''}
      </p>
      {saved === '1' ? <p className="mb-6 rounded-2xl bg-leaf-soft px-4 py-3 text-sm text-[#436b39]">Event created.</p> : null}
      <div className="card p-6 sm:p-8">
        <EventForm
          categories={categories.map((c) => ({ slug: c.slug, label: c.label }))}
          initial={{
            id: e.id,
            source: e.source,
            lockedFields: e.locked_fields,
            title: e.title,
            description: str('description'),
            category_slug: str('category_slug'),
            starts_at: toSaLocalInput(e.starts_at),
            ends_at: toSaLocalInput(e.ends_at),
            all_day: !!e.all_day,
            venue_name: str('venue_name'),
            address: str('address'),
            city_slug: str('city_slug'),
            lat: str('lat'),
            lng: str('lng'),
            price_min: str('price_min'),
            price_max: str('price_max'),
            is_free: !!e.is_free,
            ticket_url: str('ticket_url'),
            image_url: str('image_url'),
            organiser: str('organiser'),
            status: str('status'),
            featured: !!e.featured,
            featured_note: str('featured_note'),
          }}
        />
      </div>
      <div className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-6">
        <p className="text-sm text-ink-3">{manual ? 'Deleting removes this event permanently.' : 'Imported events are hidden (rejected) rather than deleted, so the next import doesn’t bring them back.'}</p>
        <ActionButton action={deleteEventAction.bind(null, e.id)} className="btn btn-danger btn-sm" confirm={manual ? 'Delete this event permanently?' : 'Hide this imported event?'}>
          <Trash2 size={15} aria-hidden="true" /> {manual ? 'Delete' : 'Hide'}
        </ActionButton>
      </div>
    </div>
  );
}
