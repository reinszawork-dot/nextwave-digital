import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, Plus, SearchX } from 'lucide-react';
import { Page, PageHeader } from '@/components/shell/AppShell';
import { EventFilters } from '@/components/events/EventFilters';
import { EventRowItem, eventWhen } from '@/components/events/EventCard';
import { EventsMap } from '@/components/events/EventsMap';
import { EmptyState } from '@/components/ui/EmptyState';
import { EVENT_CITIES, getCity } from '@/lib/cities';
import { dateKey, formatLongDate, relativeDay, timeAgo } from '@/lib/time';
import { requireUser } from '@/server/auth';
import { eventCountsByCity, lastImportAt, listEvents, type DateFilter, type PriceFilter } from '@/server/events/service';
import { getCategories } from '@/server/services/categories';
import { categoryLite, userLocation } from '@/server/services/context';

export const metadata: Metadata = { title: 'What’s On?' };

const PRICES: PriceFilter[] = ['any', 'free', 'under-200', '200-500', 'over-500'];
const WHENS = ['today', 'weekend', 'week', 'month', 'all'];

export default async function WhatsOnPage({ searchParams }: PageProps<'/whats-on'>) {
  const user = await requireUser({ next: '/whats-on' });
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '');
  const loc = userLocation(user);
  const defaultCity = EVENT_CITIES.find((c) => c.slug === user.citySlug)?.slug ?? 'all';
  const city = str('city') === 'all' || EVENT_CITIES.some((c) => c.slug === str('city')) ? str('city') : defaultCity;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(str('day')) ? str('day') : '';
  const when = (day ? `on:${day}` : WHENS.includes(str('when')) ? str('when') : 'week') as DateFilter;
  const price = (PRICES.includes(str('price') as PriceFilter) ? str('price') : 'any') as PriceFilter;
  const near = ['5', '10', '25', '50'].includes(str('near')) ? str('near') : '';
  const view = str('view') === 'map' ? 'map' : 'list';

  const [categories, counts, updated] = await Promise.all([getCategories('event'), eventCountsByCity(), lastImportAt()]);
  const cats = str('cat')
    .split(',')
    .filter((c) => categories.some((x) => x.slug === c));
  const cityObj = getCity(city);
  const nearCenter = near ? (cityObj && !loc.precise ? { lat: cityObj.lat, lng: cityObj.lng } : { lat: loc.lat, lng: loc.lng }) : null;

  const events = await listEvents(
    {
      city: city === 'all' ? null : city,
      when,
      categories: cats,
      price,
      near: nearCenter ? { ...nearCenter, km: Number(near) } : null,
      withCoords: view === 'map',
      limit: 300,
    },
    user.id,
  );
  const catMap = new Map(categories.map((c) => [c.slug, c]));
  const totalInCity = city === 'all' ? Object.values(counts).reduce((a, b) => a + b, 0) : (counts[city] ?? 0);

  // Group the list by South African calendar day.
  const groups = new Map<string, typeof events>();
  for (const e of events) {
    const key = e.starts_at < new Date() ? dateKey() : dateKey(e.starts_at);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  const cityName = city === 'all' ? 'South Africa' : (cityObj?.name ?? 'South Africa');

  return (
    <Page>
      <PageHeader
        eyebrow="What’s On?"
        title={
          <>
            What’s on in <em className="text-sun-deep">{cityName}</em>
          </>
        }
        actions={
          <Link href="/submit/event" className="btn btn-ghost">
            <Plus size={17} aria-hidden="true" /> Suggest an event
          </Link>
        }
      >
        Gigs, markets, festivals and summer parties — from ticketing partners and our team, updated daily.
      </PageHeader>

      <EventFilters
        cities={[...EVENT_CITIES.map((c) => ({ slug: c.slug, name: c.name, count: counts[c.slug] ?? 0 })), { slug: 'all', name: 'All', count: 0 }]}
        categories={categories.map((c) => categoryLite(c)!)}
        current={{ city, when: day ? '' : when, cats, price, near, view, day }}
      />

      <div className="event-results mt-8">
        {view === 'map' ? (
          <EventsMap
            center={cityObj ? { lat: cityObj.lat, lng: cityObj.lng } : { lat: loc.lat, lng: loc.lng }}
            events={events.map((e) => ({
              id: e.id,
              title: e.title,
              lat: e.lat!,
              lng: e.lng!,
              color: catMap.get(e.category_slug)?.color ?? '#a44e27',
              when: eventWhen(e),
              venue: e.venue_name,
            }))}
          />
        ) : events.length === 0 ? (
          <div className="card">
            {totalInCity === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title={`No events listed for ${cityName} yet`}
                action={
                  <Link href="/submit/event" className="btn btn-primary">
                    Suggest an event
                  </Link>
                }
              >
                We only list events from trusted ticketing sources, venue calendars and our team — never guesses. New events are imported every day, so check back soon.
              </EmptyState>
            ) : (
              <EmptyState
                icon={SearchX}
                title="Nothing matches those filters"
                action={
                  <Link href={`/whats-on?city=${city}`} className="btn btn-ghost">
                    Clear filters
                  </Link>
                }
              >
                Try a wider date range, another category or a bigger distance.
              </EmptyState>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            {[...groups.entries()].map(([key, list]) => {
              const d = new Date(`${key}T12:00:00+02:00`);
              return (
                <section key={key} aria-labelledby={`day-${key}`}>
                  <h2 id={`day-${key}`} className="sticky top-14 z-10 -mx-1 mb-3 flex items-baseline gap-3 bg-cream/90 px-1 py-2 backdrop-blur lg:top-0">
                    {['Today', 'Tomorrow'].includes(relativeDay(d)) ? (
                      <>
                        <span className="display text-[1.8rem]">{relativeDay(d)}</span>
                        <span className="text-sm text-ink-3">{formatLongDate(d)}</span>
                      </>
                    ) : (
                      <span className="display text-[1.8rem]">{formatLongDate(d)}</span>
                    )}
                  </h2>
                  <div className="space-y-3">
                    {list.map((e, i) => (
                      <div key={e.id} data-reveal="" style={{ ['--i' as string]: Math.min(i, 5) }}>
                        <EventRowItem event={e} category={categoryLite(catMap.get(e.category_slug))} showDistance={!!near} />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-10 text-xs leading-relaxed text-ink-3">
        Events come from Ticketmaster, Quicket, venue calendars and the SOMMR team.{' '}
        {updated ? `Last refreshed ${timeAgo(updated)}. ` : ''}Past events are removed automatically. Always confirm details with the organiser before you go.
      </p>
    </Page>
  );
}
