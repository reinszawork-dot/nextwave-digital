import Link from 'next/link';
import { Star } from 'lucide-react';
import { CategoryGlyph, type CategoryLite } from '@/components/common/CategoryGlyph';
import type { PlaceRow } from '@/server/places/service';

export function distanceLabel(km: number | null | undefined): string | null {
  if (km == null) return null;
  if (km < 0.95) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

/** Places from OpenStreetMap have no photos, so cards lead with typography and a category glyph. */
export function PlaceCard({ place, category }: { place: PlaceRow; category?: CategoryLite }) {
  const dist = distanceLabel(place.distance_km);
  return (
    <article className="card card-hover group relative flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="transition-[rotate,scale] duration-500 ease-[var(--ease-spring)] group-hover:-rotate-6 group-hover:scale-110">
          <CategoryGlyph category={category} size={42} />
        </span>
        <div className="flex items-center gap-1.5">
          {place.featured ? (
            <span className="tag tag-sun">
              <Star size={12} className="fill-current" aria-hidden="true" /> Pick
            </span>
          ) : null}
          {place.saves > 0 ? <span className="tag">{place.saves} saved</span> : null}
        </div>
      </div>
      <h3 className="mt-4 line-clamp-2 text-[1.02rem] font-semibold leading-snug">
        <Link href={`/places/${place.id}`} transitionTypes={['nav-forward']} className="after:absolute after:inset-0">
          {place.name}
        </Link>
      </h3>
      <p className="mt-1 truncate text-sm text-ink-3">
        {[category?.label, place.suburb ?? place.city].filter(Boolean).join(' · ')}
      </p>
      {place.featured_note ? <p className="mt-2 line-clamp-2 text-sm text-ink-2">{place.featured_note}</p> : null}
      <div className="mt-auto flex items-center gap-2 pt-3 text-xs font-medium text-ink-3">
        {dist ? <span>{dist} away</span> : null}
        {place.visited_at ? <span className="tag tag-leaf">Visited</span> : place.saved_at ? <span className="tag tag-sun">Saved</span> : null}
      </div>
    </article>
  );
}
