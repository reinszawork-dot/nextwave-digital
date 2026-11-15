import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Pencil, X } from 'lucide-react';
import { ActionButton } from '@/components/admin/ActionButton';
import { getCity } from '@/lib/cities';
import { formatShortDate, formatTime, timeAgo } from '@/lib/time';
import { setEventStatusAction, setPlaceStatusAction } from '@/server/actions/admin';
import { query, sql } from '@/server/db';

export const metadata: Metadata = { title: 'Submissions' };

export default async function SubmissionsPage() {
  const [events, places] = await Promise.all([
    query<{ id: string; title: string; starts_at: Date; venue_name: string | null; city_slug: string | null; ticket_url: string | null; description: string | null; email: string | null; created_at: Date }>(sql`
      select e.id, e.title, e.starts_at, e.venue_name, e.city_slug, e.ticket_url, e.description, u.email, e.created_at
      from events e left join users u on u.id = e.submitted_by where e.status = 'pending' order by e.created_at`),
    query<{ id: string; name: string; category_slug: string; address: string | null; city: string | null; website: string | null; description: string | null; email: string | null; created_at: Date }>(sql`
      select p.id, p.name, p.category_slug, p.address, p.city, p.website, p.description, u.email, p.created_at
      from places p left join users u on u.id = p.submitted_by where p.status = 'pending' order by p.created_at`),
  ]);
  return (
    <div className="space-y-10">
      <div>
        <h1 className="display text-5xl">Submissions</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-3">
          Events and places suggested by members. Check each one against an official source before approving — nothing is shown publicly until you do.
        </p>
      </div>
      <section>
        <h2 className="display mb-3 text-3xl">Events ({events.length})</h2>
        {events.length === 0 ? (
          <p className="card px-5 py-6 text-sm text-ink-3">No events waiting for review.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((e) => (
              <li key={e.id} className="card p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{e.title}</p>
                    <p className="text-sm text-ink-3">
                      {formatShortDate(e.starts_at)} {formatTime(e.starts_at)} · {[e.venue_name, getCity(e.city_slug)?.name].filter(Boolean).join(', ')}
                    </p>
                    {e.description ? <p className="mt-2 line-clamp-3 text-sm text-ink-2">{e.description}</p> : null}
                    <p className="mt-2 text-xs text-ink-3">
                      From {e.email ?? 'a deleted account'} · {timeAgo(e.created_at)}
                      {e.ticket_url ? (
                        <>
                          {' · '}
                          <a href={e.ticket_url} target="_blank" rel="noreferrer nofollow" className="link">
                            check the listing
                          </a>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/events/${e.id}`} className="btn btn-ghost btn-sm">
                      <Pencil size={14} aria-hidden="true" /> Edit
                    </Link>
                    <ActionButton action={setEventStatusAction.bind(null, e.id, 'rejected', 'Not approved')} className="btn btn-danger btn-sm" success="Rejected">
                      <X size={14} aria-hidden="true" /> Reject
                    </ActionButton>
                    <ActionButton action={setEventStatusAction.bind(null, e.id, 'published', 'Approved')} className="btn btn-primary btn-sm" success="Approved and published">
                      <Check size={14} aria-hidden="true" /> Approve
                    </ActionButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="display mb-3 text-3xl">Places ({places.length})</h2>
        {places.length === 0 ? (
          <p className="card px-5 py-6 text-sm text-ink-3">No places waiting for review.</p>
        ) : (
          <ul className="space-y-3">
            {places.map((p) => (
              <li key={p.id} className="card p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-ink-3">{[p.category_slug, p.address, p.city].filter(Boolean).join(' · ')}</p>
                    {p.description ? <p className="mt-2 line-clamp-3 text-sm text-ink-2">{p.description}</p> : null}
                    <p className="mt-2 text-xs text-ink-3">
                      From {p.email ?? 'a deleted account'} · {timeAgo(p.created_at)}
                      {p.website ? (
                        <>
                          {' · '}
                          <a href={p.website} target="_blank" rel="noreferrer nofollow" className="link">
                            website
                          </a>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/places/${p.id}`} className="btn btn-ghost btn-sm">
                      <Pencil size={14} aria-hidden="true" /> Edit
                    </Link>
                    <ActionButton action={setPlaceStatusAction.bind(null, p.id, 'rejected', 'Not approved')} className="btn btn-danger btn-sm" success="Rejected">
                      <X size={14} aria-hidden="true" /> Reject
                    </ActionButton>
                    <ActionButton action={setPlaceStatusAction.bind(null, p.id, 'published', 'Approved')} className="btn btn-primary btn-sm" success="Approved and published">
                      <Check size={14} aria-hidden="true" /> Approve
                    </ActionButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
