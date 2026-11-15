import Link from 'next/link';
import { ViewTransition } from 'react';
import { MapPin } from 'lucide-react';
import { CategoryIcon } from '@/components/ui/Icon';
import { SaveButton } from '@/components/common/SaveButton';
import type { CategoryLite } from '@/components/common/CategoryGlyph';
import { getCity } from '@/lib/cities';
import { formatDayNumber, formatMonthShort, formatTime, formatWeekday, relativeDay } from '@/lib/time';
import { saveEventAction } from '@/server/actions/activity';
import { priceLabel, type EventRow } from '@/server/events/service';

export function eventWhen(e: Pick<EventRow, 'starts_at' | 'all_day' | 'ends_at'>): string {
  const day = relativeDay(e.starts_at);
  if (e.all_day) return e.ends_at && relativeDay(e.ends_at) !== day ? `${day} – ${relativeDay(e.ends_at)}` : `${day} · All day`;
  return `${day} · ${formatTime(e.starts_at)}`;
}

function DatePanel({ event, category, tall = false }: { event: EventRow; category?: CategoryLite; tall?: boolean }) {
  const color = category?.color ?? '#a44e27';
  return (
    <div
      className={`relative flex ${tall ? 'aspect-[16/10]' : 'h-full'} w-full items-end justify-between overflow-hidden p-4`}
      style={{ background: `linear-gradient(145deg, color-mix(in srgb, ${color} 16%, #fffdf9), color-mix(in srgb, ${color} 30%, #f4ede2))` }}
    >
      <div className="leading-none" style={{ color: `color-mix(in srgb, ${color} 85%, black)` }}>
        <span className="block text-xs font-semibold tracking-[0.14em]">{formatMonthShort(event.starts_at)}</span>
        <span className="display block text-5xl">{formatDayNumber(event.starts_at)}</span>
      </div>
      <span className="opacity-70" style={{ color }}>
        <CategoryIcon name={category?.icon ?? 'calendar'} size={34} strokeWidth={1.4} />
      </span>
    </div>
  );
}

/** Vertical event card for scrollers and grids. */
export function EventCard({ event, category, className = '' }: { event: EventRow; category?: CategoryLite; className?: string }) {
  const price = priceLabel(event);
  const city = getCity(event.city_slug);
  return (
    <article className={`card card-hover group relative flex flex-col overflow-hidden ${className}`}>
      <ViewTransition name={`event-media-${event.id}`} share="morph" default="none">
      <div className="relative aspect-[16/10] overflow-hidden bg-sand">
        {event.image_url ? (
          // Provider images (Ticketmaster, Quicket, organisers) are shown as published by the source.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.image_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
        ) : (
          <DatePanel event={event} category={category} tall />
        )}
        <div className="absolute right-3 top-3">
          <SaveButton saved={event.saved} onToggle={saveEventAction.bind(null, event.id)} label={event.title} size="sm" />
        </div>
        {event.featured ? <span className="tag tag-sun absolute left-3 top-3 !bg-paper/95">Editor’s pick</span> : null}
      </div>
      </ViewTransition>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[0.8rem] font-semibold text-sun-deep">{eventWhen(event)}</p>
        <h3 className="mt-1 line-clamp-2 text-[1.02rem] font-semibold leading-snug">
          <Link href={`/events/${event.id}`} transitionTypes={['nav-forward']} className="after:absolute after:inset-0">
            {event.title}
          </Link>
        </h3>
        {event.venue_name || city ? (
          <p className="mt-1.5 flex items-center gap-1 truncate text-sm text-ink-3">
            <MapPin size={13} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{[event.venue_name, city?.name].filter(Boolean).join(' · ')}</span>
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
          {category ? <span className="tag">{category.label}</span> : null}
          {price ? <span className="tag tag-sea">{price}</span> : null}
        </div>
      </div>
    </article>
  );
}

/** Horizontal row for the What's On list. */
export function EventRowItem({ event, category, showDistance }: { event: EventRow; category?: CategoryLite; showDistance?: boolean }) {
  const price = priceLabel(event);
  const city = getCity(event.city_slug);
  return (
    <article className="card card-hover group relative flex items-stretch gap-4 overflow-hidden p-3 sm:p-4">
      <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-sand py-2 text-center transition-colors duration-500 group-hover:bg-sun-soft sm:w-[4.5rem]">
        <span className="text-[0.68rem] font-semibold tracking-[0.12em] text-ink-3">{formatWeekday(event.starts_at).toUpperCase()}</span>
        <span className="display text-[2rem] leading-none">{formatDayNumber(event.starts_at)}</span>
        <span className="text-[0.68rem] font-semibold tracking-[0.12em] text-sun-deep">{formatMonthShort(event.starts_at)}</span>
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-[0.78rem] font-semibold text-sun-deep">
          {event.all_day ? 'All day' : formatTime(event.starts_at)}
          {event.ends_at && !event.all_day && formatDayNumber(event.ends_at) === formatDayNumber(event.starts_at) ? ` – ${formatTime(event.ends_at)}` : ''}
        </p>
        <h3 className="mt-0.5 line-clamp-2 font-semibold leading-snug">
          <Link href={`/events/${event.id}`} transitionTypes={['nav-forward']} className="after:absolute after:inset-0">
            {event.title}
          </Link>
        </h3>
        <p className="mt-1 truncate text-sm text-ink-3">
          {[event.venue_name, city?.name].filter(Boolean).join(' · ') || 'Venue to be confirmed'}
          {showDistance && event.distance_km != null ? ` · ${event.distance_km < 1 ? '<1' : Math.round(event.distance_km)} km` : ''}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {category ? <span className="tag">{category.label}</span> : null}
          {price ? <span className="tag tag-sea">{price}</span> : null}
          {event.featured ? <span className="tag tag-sun">Editor’s pick</span> : null}
        </div>
      </div>
      {event.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.image_url} alt="" loading="lazy" className="hidden h-auto w-36 shrink-0 rounded-2xl object-cover transition-[scale] duration-700 ease-[var(--ease-soft)] group-hover:scale-[1.03] sm:block" />
      ) : null}
      <div className="relative z-10 self-start">
        <SaveButton saved={event.saved} onToggle={saveEventAction.bind(null, event.id)} label={event.title} size="sm" />
      </div>
    </article>
  );
}

export { DatePanel };
