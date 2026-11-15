import type { Metadata } from 'next';
import { ViewTransition } from 'react';
import { ExploreMap } from '@/components/explore/ExploreMap';
import { PAGE_TRANSITION } from '@/components/shell/AppShell';
import { requireUser } from '@/server/auth';
import { getPlace } from '@/server/places/service';
import { getCategories } from '@/server/services/categories';
import { userLocation } from '@/server/services/context';

export const metadata: Metadata = { title: 'Explore' };

export default async function ExplorePage({ searchParams }: PageProps<'/explore'>) {
  const user = await requireUser({ next: '/explore' });
  const sp = await searchParams;
  const categories = await getCategories('place');
  const category = typeof sp.category === 'string' && categories.some((c) => c.slug === sp.category) ? sp.category : null;
  const placeId = typeof sp.place === 'string' ? sp.place : null;
  const place = placeId ? await getPlace(placeId, user.id) : null;
  const loc = userLocation(user);
  const center = place
    ? { lat: place.lat, lng: place.lng, zoom: 15.5 }
    : { lat: loc.lat, lng: loc.lng, zoom: loc.precise ? 14 : 13 };
  return (
    <>
      <h1 className="sr-only">Explore places</h1>
      <ViewTransition enter={PAGE_TRANSITION.enter} exit={PAGE_TRANSITION.exit} default="none">
      <ExploreMap
        categories={categories.map((c) => ({ slug: c.slug, label: c.label, icon: c.icon, color: c.color, events: c.event_categories.length > 0 }))}
        center={center}
        initialCategory={category}
        initialPlaceId={place?.id ?? null}
      />
      </ViewTransition>
    </>
  );
}
