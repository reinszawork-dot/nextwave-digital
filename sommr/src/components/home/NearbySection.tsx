'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Compass, RefreshCw } from 'lucide-react';
import { PlaceCard } from '@/components/places/PlaceCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { CategoryLite } from '@/components/common/CategoryGlyph';
import type { PlaceDto } from '@/server/api';
import type { PlaceRow } from '@/server/places/service';

/**
 * Nearby places load in the browser so the dashboard never waits on map data.
 * The first visit to an area fetches it from OpenStreetMap; after that it's cached.
 */
export function NearbySection({
  lat,
  lng,
  categories,
  categoryInfo,
  radiusKm,
}: {
  lat: number;
  lng: number;
  categories: string[];
  categoryInfo: Record<string, CategoryLite>;
  radiusKm: number;
}) {
  const [state, setState] = useState<{ status: 'loading' | 'done' | 'failed'; places: PlaceDto[]; error: string | null }>({
    status: 'loading',
    places: [],
    error: null,
  });
  const [attempt, setAttempt] = useState(0);
  const categoryKey = categories.join(',');

  useEffect(() => {
    const ctrl = new AbortController();
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng), categories: categoryKey, limit: '8', radius: String(radiusKm) });
    fetch(`/api/places/nearby?${params}`, { signal: ctrl.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? 'Request failed');
        setState({ status: 'done', places: d.places, error: d.error });
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setState({ status: 'failed', places: [], error: err.message });
      });
    return () => ctrl.abort();
  }, [lat, lng, categoryKey, radiusKm, attempt]);

  if (state.status === 'loading') return <NearbySkeleton />;
  if (state.places.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={Compass}
          title={state.error ? 'Places are taking a breather' : 'Still mapping your area'}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {state.error ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setState({ status: 'loading', places: [], error: null });
                    setAttempt((a) => a + 1);
                  }}
                >
                  <RefreshCw size={16} aria-hidden="true" /> Try again
                </button>
              ) : null}
              <Link href="/explore" className="btn btn-ghost">
                Open the map
              </Link>
            </div>
          }
        >
          {state.error
            ? 'Our open map data source isn’t answering right now. Try again in a few minutes.'
            : 'We couldn’t find places matching your interests close by yet. The map shows everything around you.'}
        </EmptyState>
      </div>
    );
  }
  return (
    <>
      <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-4">
        {state.places.map((p, i) => (
          <div key={p.id} style={{ ['--i' as string]: i }}>
            <PlaceCard place={toRow(p)} category={categoryInfo[p.category]} />
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-3">
        Place data ©{' '}
        <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap contributors
        </a>
      </p>
    </>
  );
}

function toRow(p: PlaceDto): PlaceRow {
  return {
    id: p.id,
    name: p.name,
    category_slug: p.category,
    lat: p.lat,
    lng: p.lng,
    suburb: p.suburb,
    featured: p.featured,
    featured_note: p.featuredNote,
    saves: p.saves,
    saved_at: p.saved ? new Date() : null,
    visited_at: p.visited ? new Date() : null,
    distance_km: p.distanceKm ?? undefined,
  } as PlaceRow;
}

export function NearbySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Loading places nearby" role="status">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="card h-40 p-4">
          <div className="skeleton h-10 w-10 !rounded-full" />
          <div className="skeleton mt-4 h-5 w-3/4" />
          <div className="skeleton mt-2 h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
