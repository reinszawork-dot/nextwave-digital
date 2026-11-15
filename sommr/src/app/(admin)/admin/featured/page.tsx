import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionButton } from '@/components/admin/ActionButton';
import { formatShortDate } from '@/lib/time';
import { toggleFeaturedAction } from '@/server/actions/admin';
import { query, sql } from '@/server/db';

export const metadata: Metadata = { title: 'Featured' };

export default async function FeaturedPage() {
  const [events, places, challenges] = await Promise.all([
    query<{ id: string; title: string; starts_at: Date; featured_note: string | null }>(sql`
      select id, title, starts_at, featured_note from events where featured and status = 'published'
        and coalesce(ends_at, starts_at + interval '6 hours') >= now() order by starts_at`),
    query<{ id: string; name: string; suburb: string | null; featured_note: string | null }>(sql`
      select id, name, suburb, featured_note from places where featured order by name`),
    query<{ id: string; title: string; kind: string }>(sql`select id, title, kind from challenges where featured order by title`),
  ]);
  const Section = ({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) => (
    <section>
      <h2 className="display mb-3 text-3xl">{title}</h2>
      {empty ? <p className="card px-5 py-6 text-sm text-ink-3">Nothing featured. Use “Feature as an editor’s pick” when editing.</p> : <ul className="card divide-y divide-line">{children}</ul>}
    </section>
  );
  return (
    <div className="space-y-10">
      <div>
        <h1 className="display text-5xl">Featured</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-3">Editor’s picks appear first on dashboards, lists and the map. Featured challenges are offered more often.</p>
      </div>
      <Section title="Events" empty={!events.length}>
        {events.map((e) => (
          <li key={e.id} className="flex items-center gap-3 px-5 py-3">
            <Link href={`/admin/events/${e.id}`} className="min-w-0 flex-1">
              <span className="block truncate font-medium">{e.title}</span>
              <span className="block truncate text-xs text-ink-3">{formatShortDate(e.starts_at)}{e.featured_note ? ` · ${e.featured_note}` : ''}</span>
            </Link>
            <ActionButton action={toggleFeaturedAction.bind(null, 'event', e.id, false)} success="Removed from featured">
              Unfeature
            </ActionButton>
          </li>
        ))}
      </Section>
      <Section title="Places" empty={!places.length}>
        {places.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-5 py-3">
            <Link href={`/admin/places/${p.id}`} className="min-w-0 flex-1">
              <span className="block truncate font-medium">{p.name}</span>
              <span className="block truncate text-xs text-ink-3">{[p.suburb, p.featured_note].filter(Boolean).join(' · ')}</span>
            </Link>
            <ActionButton action={toggleFeaturedAction.bind(null, 'place', p.id, false)} success="Removed from featured">
              Unfeature
            </ActionButton>
          </li>
        ))}
      </Section>
      <Section title="Challenges" empty={!challenges.length}>
        {challenges.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-5 py-3">
            <Link href={`/admin/challenges/${c.id}`} className="min-w-0 flex-1 truncate font-medium">
              {c.title} <span className="text-xs text-ink-3">· {c.kind}</span>
            </Link>
            <ActionButton action={toggleFeaturedAction.bind(null, 'challenge', c.id, false)} success="Removed from featured">
              Unfeature
            </ActionButton>
          </li>
        ))}
      </Section>
    </div>
  );
}
