import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { EventCard } from '@/components/events/EventCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { SessionUser } from '@/server/auth';
import { eventsForDashboard } from '@/server/events/service';
import { getCategoryMap } from '@/server/services/categories';
import { categoryLite, interestEventCategories, userLocation } from '@/server/services/context';

export async function EventsSection({ user }: { user: SessionUser }) {
  const loc = userLocation(user);
  const [events, categories] = await Promise.all([
    eventsForDashboard({
      city: loc.city.events ? loc.city.slug : null,
      near: loc.city.events ? null : { lat: loc.lat, lng: loc.lng },
      categories: interestEventCategories(user),
      userId: user.id,
      limit: 8,
    }),
    getCategoryMap(),
  ]);
  if (events.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={CalendarDays}
          title="Nothing listed yet"
          action={
            <Link href="/submit/event" className="btn btn-ghost">
              Know of an event? Suggest it
            </Link>
          }
        >
          We only show events from trusted sources and our team, and none are listed for {loc.city.name} in the next three weeks yet. Check back soon.
        </EmptyState>
      </div>
    );
  }
  return (
    <div className="scroller -mx-4 px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
      {events.map((e) => (
        <EventCard key={e.id} event={e} category={categoryLite(categories.get(e.category_slug))} className="w-[78vw] max-w-[300px] sm:w-[280px]" />
      ))}
    </div>
  );
}

export function EventsSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden" aria-label="Loading events">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="w-[280px] shrink-0">
          <div className="skeleton aspect-[16/10] !rounded-[22px]" />
          <div className="skeleton mt-3 h-4 w-24" />
          <div className="skeleton mt-2 h-5 w-52" />
        </div>
      ))}
    </div>
  );
}
