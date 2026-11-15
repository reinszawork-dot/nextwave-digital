import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Map as MapIcon } from 'lucide-react';
import { Page } from '@/components/shell/AppShell';
import { MiniMap } from '@/components/common/MiniMap';
import { PlaceDetail } from '@/components/explore/PlaceDetail';
import { requireUser } from '@/server/auth';
import { getPlace, osmUrl } from '@/server/places/service';
import { getCategoryMap } from '@/server/services/categories';
import { categoryLite } from '@/server/services/context';

export async function generateMetadata({ params }: PageProps<'/places/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const place = await getPlace(id, null);
  return { title: place?.name ?? 'Place' };
}

export default async function PlacePage({ params }: PageProps<'/places/[id]'>) {
  const { id } = await params;
  const user = await requireUser({ next: `/places/${id}` });
  const place = await getPlace(id, user.id);
  if (!place || (place.status !== 'published' && user.role !== 'admin')) notFound();
  const categories = await getCategoryMap();
  const cat = categoryLite(categories.get(place.category_slug));
  return (
    <Page>
      <Link href="/explore" transitionTypes={['nav-back']} className="group mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-3 hover:text-ink">
        <ArrowLeft size={16} className="transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-translate-x-1" aria-hidden="true" /> Explore
      </Link>
      <div className="stagger grid gap-8 lg:grid-cols-[1fr_1.1fr]" style={{ ['--stagger' as string]: '120ms' }}>
        <div className="card p-6 sm:p-8">
          <PlaceDetail
            category={cat}
            place={{
              id: place.id,
              name: place.name,
              category: place.category_slug,
              lat: place.lat,
              lng: place.lng,
              address: place.address,
              suburb: place.suburb,
              city: place.city,
              description: place.description,
              website: place.website,
              phone: place.phone,
              openingHours: place.opening_hours,
              tags: place.tags,
              featured: place.featured,
              featuredNote: place.featured_note,
              saved: !!place.saved_at,
              visited: !!place.visited_at,
              saves: place.saves,
              source: place.source,
              osmUrl: place.source === 'osm' ? osmUrl(place.source_id) : null,
            }}
          />
        </div>
        <div className="space-y-3">
          <MiniMap lat={place.lat} lng={place.lng} color={cat?.color} label={place.name} />
          <Link href={`/explore?place=${place.id}`} className="btn btn-ghost w-full">
            <MapIcon size={17} aria-hidden="true" /> See what’s nearby
          </Link>
        </div>
      </div>
    </Page>
  );
}
