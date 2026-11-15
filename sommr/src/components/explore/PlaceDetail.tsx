'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { ArrowLeft, Check, Clock, ExternalLink, Globe, Heart, ListPlus, Navigation, Phone, Star } from 'lucide-react';
import { CategoryPill, type CategoryLite } from '@/components/common/CategoryGlyph';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { prettyOpeningHours } from '@/lib/opening-hours';
import { addBucketAction, markPlaceAction } from '@/server/actions/activity';
import { directionsLinks } from './mapStyle';

export interface PlaceDetailData {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  address: string | null;
  suburb: string | null;
  city: string | null;
  description: string | null;
  website: string | null;
  phone: string | null;
  openingHours: string | null;
  tags: Record<string, string>;
  featured: boolean;
  featuredNote: string | null;
  saved: boolean;
  visited: boolean;
  saves: number;
  source: string;
  osmUrl: string | null;
}

const NICE_TAGS: [string, (v: string) => string | null][] = [
  ['cuisine', (v) => `Cuisine: ${v.replace(/_/g, ' ').replace(/;/g, ', ')}`],
  ['outdoor_seating', (v) => (v === 'yes' ? 'Outdoor seating' : null)],
  ['wheelchair', (v) => (v === 'yes' ? 'Wheelchair accessible' : v === 'limited' ? 'Limited wheelchair access' : null)],
  ['fee', (v) => (v === 'no' ? 'Free entry' : v === 'yes' ? 'Entry fee' : null)],
  ['lifeguard', (v) => (v === 'yes' ? 'Lifeguards on duty (seasonal)' : null)],
  ['blue_flag', (v) => (v === 'yes' ? 'Blue Flag beach' : null)],
  ['dog', (v) => (v === 'yes' ? 'Dog friendly' : v === 'no' ? 'No dogs' : null)],
  ['diet:vegan', (v) => (v === 'yes' || v === 'only' ? 'Vegan options' : null)],
  ['takeaway', (v) => (v === 'yes' ? 'Takeaway' : null)],
];

export function PlaceDetail({
  place,
  category,
  onBack,
  onChange,
}: {
  place: PlaceDetailData;
  category?: CategoryLite;
  onBack?: () => void;
  onChange?: (patch: Partial<PlaceDetailData>) => void;
}) {
  const toast = useToast();
  const [saved, setSaved] = useState(place.saved);
  const [visited, setVisited] = useState(place.visited);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const hours = prettyOpeningHours(place.openingHours);
  const facts = NICE_TAGS.map(([k, f]) => (place.tags?.[k] ? f(place.tags[k]) : null)).filter(Boolean) as string[];
  const dir = directionsLinks(place.lat, place.lng);

  const mark = (field: 'saved' | 'visited', next: boolean) => {
    setBusy(field);
    if (field === 'saved') setSaved(next);
    else setVisited(next);
    start(async () => {
      const r = await markPlaceAction(place.id, field, next);
      setBusy(null);
      if (!r.ok) {
        if (field === 'saved') setSaved(!next);
        else setVisited(!next);
        return toast(r.error, { tone: 'error' });
      }
      onChange?.(field === 'saved' ? { saved: next } : { visited: next });
      if (next && field === 'visited') {
        toast(r.points ? `Marked as visited · +${r.points} points` : 'Marked as visited', {
          detail: r.earned.length ? `New badge: ${r.earned[0].title}` : 'It’s on your My Summer timeline.',
        });
      } else if (next) toast('Saved', { detail: 'Find it in My Summer → Saved.' });
    });
  };

  return (
    <div className="fade-in">
      {onBack ? (
        <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-3 hover:text-ink">
          <ArrowLeft size={16} aria-hidden="true" /> All places
        </button>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <CategoryPill category={category} />
        {place.featured ? (
          <span className="tag tag-sun">
            <Star size={12} className="fill-current" aria-hidden="true" /> Editor’s pick
          </span>
        ) : null}
      </div>
      <h2 className="display mt-3 text-[2.1rem]">{place.name}</h2>
      {place.address || place.suburb ? <p className="mt-1 text-sm text-ink-3">{place.address ?? place.suburb}</p> : null}
      {place.featuredNote ? <p className="mt-3 rounded-2xl bg-sun-soft/70 px-4 py-3 text-sm text-ink-2">{place.featuredNote}</p> : null}
      {place.description ? <p className="prose-sommr mt-3 text-[0.95rem]">{place.description}</p> : null}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" aria-pressed={saved} onClick={() => mark('saved', !saved)} disabled={pending} className={`btn ${saved ? 'btn-soft' : 'btn-ghost'}`}>
          {busy === 'saved' ? <Spinner /> : <Heart size={17} className={saved ? 'fill-sun text-sun' : ''} aria-hidden="true" />}
          {saved ? 'Saved' : 'Save'}
        </button>
        <button type="button" aria-pressed={visited} onClick={() => mark('visited', !visited)} disabled={pending} className={`btn ${visited ? 'bg-leaf text-white' : 'btn-ghost'}`}>
          {busy === 'visited' ? <Spinner /> : <Check size={17} strokeWidth={2.4} aria-hidden="true" />}
          {visited ? 'Visited' : 'I’ve been'}
        </button>
        <a href={dir.google} target="_blank" rel="noreferrer" className="btn btn-primary col-span-2">
          <Navigation size={17} aria-hidden="true" /> Directions
        </a>
      </div>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-ink-3">
        <span>Open in</span>
        <a href={dir.google} target="_blank" rel="noreferrer" className="link">
          Google Maps
        </a>
        <a href={dir.waze} target="_blank" rel="noreferrer" className="link">
          Waze
        </a>
        <a href={dir.apple} target="_blank" rel="noreferrer" className="link">
          Apple Maps
        </a>
      </div>

      <dl className="mt-6 divide-y divide-line border-y border-line text-sm">
        {hours.length ? (
          <div className="flex gap-3 py-3">
            <dt>
              <Clock size={17} className="mt-0.5 text-ink-3" aria-label="Opening hours" />
            </dt>
            <dd className="space-y-0.5 text-ink-2">
              {hours.map((h) => (
                <p key={h}>{h}</p>
              ))}
            </dd>
          </div>
        ) : null}
        {place.phone ? (
          <div className="flex gap-3 py-3">
            <dt>
              <Phone size={17} className="mt-0.5 text-ink-3" aria-label="Phone" />
            </dt>
            <dd>
              <a className="link" href={`tel:${place.phone.replace(/[^+\d]/g, '')}`}>
                {place.phone}
              </a>
            </dd>
          </div>
        ) : null}
        {place.website ? (
          <div className="flex gap-3 py-3">
            <dt>
              <Globe size={17} className="mt-0.5 text-ink-3" aria-label="Website" />
            </dt>
            <dd className="min-w-0">
              <a className="link block truncate" href={place.website} target="_blank" rel="noreferrer nofollow">
                {place.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
              </a>
            </dd>
          </div>
        ) : null}
        {facts.length ? (
          <div className="flex flex-wrap gap-1.5 py-3">
            {facts.map((f) => (
              <span key={f} className="tag">
                {f}
              </span>
            ))}
          </div>
        ) : null}
      </dl>
      {!hours.length && !place.phone && !place.website ? (
        <p className="mt-3 text-sm text-ink-3">No hours or contact details are listed for this place yet — check before you go.</p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-soft btn-sm"
          onClick={() =>
            start(async () => {
              const r = await addBucketAction({ title: `Visit ${place.name}`, placeId: place.id });
              if (!r.ok) return toast(r.error, { tone: 'error' });
              toast('Added to your bucket list');
            })
          }
        >
          <ListPlus size={16} aria-hidden="true" /> Add to bucket list
        </button>
        <Link href={`/places/${place.id}`} className="btn btn-sm text-ink-2 hover:bg-sand">
          Full page
        </Link>
      </div>

      {place.osmUrl ? (
        <p className="mt-6 text-xs leading-relaxed text-ink-3">
          Data © OpenStreetMap contributors.{' '}
          <a href={place.osmUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline">
            Something wrong? Fix it on OpenStreetMap <ExternalLink size={11} aria-hidden="true" />
          </a>
        </p>
      ) : null}
    </div>
  );
}
