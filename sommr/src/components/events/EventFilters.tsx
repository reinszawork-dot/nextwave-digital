'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Segmented } from '@/components/ui/Segmented';
import { List, Map as MapIcon, SlidersHorizontal, X } from 'lucide-react';
import { CategoryIcon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import type { CategoryLite } from '@/components/common/CategoryGlyph';

const WHEN = [
  { value: 'week', label: 'Next 7 days' },
  { value: 'today', label: 'Today' },
  { value: 'weekend', label: 'This weekend' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'Any time' },
];

const PRICE = [
  { value: 'any', label: 'Any price' },
  { value: 'free', label: 'Free' },
  { value: 'under-200', label: 'Under R200' },
  { value: '200-500', label: 'R200 – R500' },
  { value: 'over-500', label: 'Over R500' },
];

const NEAR = [
  { value: '', label: 'Whole city' },
  { value: '5', label: 'Within 5 km' },
  { value: '10', label: 'Within 10 km' },
  { value: '25', label: 'Within 25 km' },
  { value: '50', label: 'Within 50 km' },
];

export function EventFilters({
  cities,
  categories,
  current,
}: {
  cities: { slug: string; name: string; count: number }[];
  categories: CategoryLite[];
  current: { city: string; when: string; cats: string[]; price: string; near: string; view: string; day: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  // Selections change instantly; results follow when the server responds.
  const [optimistic, setOptimistic] = useState<{ city?: string; view?: string }>({});
  useEffect(() => setOptimistic({}), [current.city, current.view]);
  const city = optimistic.city ?? current.city;
  const view = optimistic.view ?? current.view;

  // Let the results area dim softly while new ones load (see .event-results in globals.css).
  useEffect(() => {
    document.body.toggleAttribute('data-filtering', pending);
    return () => document.body.removeAttribute('data-filtering');
  }, [pending]);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '') next.delete(k);
      else next.set(k, v);
    }
    start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  const toggleCat = (slug: string) => {
    const cats = current.cats.includes(slug) ? current.cats.filter((c) => c !== slug) : [...current.cats, slug];
    set({ cat: cats.join(',') || null });
  };
  const active = current.cats.length > 0 || current.price !== 'any' || current.near !== '' || current.day !== '';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          id="city"
          label="City"
          className="max-w-full overflow-x-auto"
          value={city}
          onChange={(v) => {
            setOptimistic((o) => ({ ...o, city: v }));
            set({ city: v, near: null });
          }}
          items={cities.map((c) => ({
            value: c.slug,
            label: (
              <>
                {c.name}
                {c.count ? <span className="text-xs text-ink-3">{c.count}</span> : null}
              </>
            ),
          }))}
        />
        <div className="flex items-center gap-2">
          <span className={`transition-opacity duration-300 ${pending ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!pending}>
            <Spinner className="text-ink-3" />
          </span>
          <Segmented
            id="view"
            label="View"
            value={view === 'map' ? 'map' : 'list'}
            onChange={(v) => {
              setOptimistic((o) => ({ ...o, view: v }));
              set({ view: v === 'map' ? 'map' : null });
            }}
            items={[
              { value: 'list', label: (<><List size={15} aria-hidden="true" /> List</>) },
              { value: 'map', label: (<><MapIcon size={15} aria-hidden="true" /> Map</>) },
            ]}
          />
        </div>
      </div>

      <div className="scroller !gap-2" role="group" aria-label="When">
        {WHEN.map((w) => (
          <button key={w.value} type="button" className="chip" aria-pressed={!current.day && current.when === w.value} onClick={() => set({ when: w.value === 'week' ? null : w.value, day: null })}>
            {w.label}
          </button>
        ))}
        <label className={`chip cursor-pointer ${current.day ? '!border-ink !bg-ink !text-cream' : ''}`}>
          <span className="sr-only">Pick a date</span>
          <input
            type="date"
            value={current.day}
            onChange={(e) => set({ day: e.target.value || null, when: null })}
            className="w-[8.6rem] bg-transparent text-sm outline-none [color-scheme:light]"
            aria-label="Pick a date"
          />
        </label>
      </div>

      <div className="scroller !gap-2" role="group" aria-label="Event type">
        {categories.map((c) => (
          <button key={c.slug} type="button" className="chip" aria-pressed={current.cats.includes(c.slug)} onClick={() => toggleCat(c.slug)}>
            <CategoryIcon name={c.icon} size={15} />
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal size={16} className="text-ink-3" aria-hidden="true" />
        <label className="sr-only" htmlFor="ev-price">
          Price
        </label>
        <select id="ev-price" className="select !h-9 !w-auto !rounded-full !py-0 !pl-3.5 text-sm" value={current.price} onChange={(e) => set({ price: e.target.value === 'any' ? null : e.target.value })}>
          {PRICE.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="ev-near">
          Distance
        </label>
        <select id="ev-near" className="select !h-9 !w-auto !rounded-full !py-0 !pl-3.5 text-sm" value={current.near} onChange={(e) => set({ near: e.target.value || null })}>
          {NEAR.map((n) => (
            <option key={n.value} value={n.value}>
              {n.label}
            </option>
          ))}
        </select>
        {active ? (
          <button type="button" className="btn btn-sm text-ink-3 hover:text-ink" onClick={() => set({ cat: null, price: null, near: null, day: null })}>
            <X size={14} aria-hidden="true" /> Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
