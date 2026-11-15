import type { Metadata } from 'next';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { EventRowItem } from '@/components/events/EventCard';
import { PlaceCard } from '@/components/places/PlaceCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { requireUser } from '@/server/auth';
import { savedEvents } from '@/server/events/service';
import { savedPlaces } from '@/server/places/service';
import { getCategoryMap } from '@/server/services/categories';
import { categoryLite } from '@/server/services/context';

export const metadata: Metadata = { title: 'Saved' };

export default async function SavedPage() {
  const user = await requireUser({ next: '/my-summer/saved' });
  const [places, visited, events, categories] = await Promise.all([
    savedPlaces(user.id, 'saved'),
    savedPlaces(user.id, 'visited'),
    savedEvents(user.id),
    getCategoryMap(),
  ]);
  if (!places.length && !visited.length && !events.length) {
    return (
      <div className="card">
        <EmptyState
          icon={Heart}
          title="Nothing saved yet"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/explore" className="btn btn-primary">
                Explore places
              </Link>
              <Link href="/whats-on" className="btn btn-ghost">
                Browse events
              </Link>
            </div>
          }
        >
          Tap the heart on any place or event to keep it here for later.
        </EmptyState>
      </div>
    );
  }
  return (
    <div className="space-y-12">
      {events.length ? (
        <section aria-labelledby="saved-events">
          <h2 id="saved-events" className="display mb-4 text-[1.9rem]">
            Upcoming events
          </h2>
          <div className="space-y-3">
            {events.map((e) => (
              <EventRowItem key={e.id} event={e} category={categoryLite(categories.get(e.category_slug))} />
            ))}
          </div>
        </section>
      ) : null}
      {places.length ? (
        <section aria-labelledby="saved-places">
          <h2 id="saved-places" className="display mb-4 text-[1.9rem]">
            Saved places
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {places.map((p) => (
              <PlaceCard key={p.id} place={p} category={categoryLite(categories.get(p.category_slug))} />
            ))}
          </div>
        </section>
      ) : null}
      {visited.length ? (
        <section aria-labelledby="visited-places">
          <h2 id="visited-places" className="display mb-4 text-[1.9rem]">
            Places you’ve been
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {visited.map((p) => (
              <PlaceCard key={p.id} place={p} category={categoryLite(categories.get(p.category_slug))} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
