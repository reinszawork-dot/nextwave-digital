import type { Metadata } from 'next';
import Link from 'next/link';
import { ViewTransition } from 'react';
import { WordReveal } from '@/components/motion/WordReveal';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CalendarPlus, Clock, ExternalLink, MapPin, Navigation, Ticket, User } from 'lucide-react';
import { Page } from '@/components/shell/AppShell';
import { CategoryPill } from '@/components/common/CategoryGlyph';
import { MiniMap } from '@/components/common/MiniMap';
import { SaveButton } from '@/components/common/SaveButton';
import { ShareButton } from '@/components/common/ShareButton';
import { DatePanel } from '@/components/events/EventCard';
import { ExpandableText } from '@/components/common/ExpandableText';
import { directionsLinks } from '@/components/explore/mapStyle';
import { getCity } from '@/lib/cities';
import { formatLongDate, formatTime, timeAgo } from '@/lib/time';
import { saveEventAction } from '@/server/actions/activity';
import { requireUser } from '@/server/auth';
import { getEvent, priceLabel } from '@/server/events/service';
import { getCategoryMap } from '@/server/services/categories';
import { categoryLite } from '@/server/services/context';

export async function generateMetadata({ params }: PageProps<'/events/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const e = await getEvent(id, null);
  return { title: e?.title ?? 'Event' };
}

const SOURCE_LABEL: Record<string, string> = {
  ticketmaster: 'Ticketmaster',
  quicket: 'Quicket',
  ical: 'a venue calendar',
  jsonld: 'the organiser’s website',
  admin: 'the SOMMR team',
  community: 'a SOMMR member, reviewed by our team',
};

export default async function EventPage({ params }: PageProps<'/events/[id]'>) {
  const { id } = await params;
  const user = await requireUser({ next: `/events/${id}` });
  const e = await getEvent(id, user.id);
  const visible = e && (['published', 'cancelled', 'archived'].includes(e.status) || user.role === 'admin');
  if (!e || !visible) notFound();
  const categories = await getCategoryMap();
  const cat = categoryLite(categories.get(e.category_slug));
  const city = getCity(e.city_slug);
  const price = priceLabel(e);
  const ended = (e.ends_at ?? new Date(e.starts_at.getTime() + 6 * 3_600_000)) < new Date();
  const multiDay = e.ends_at && formatLongDate(e.ends_at) !== formatLongDate(e.starts_at);
  const location = [e.venue_name, e.address && e.address !== e.venue_name ? e.address : null, !e.address ? city?.name : null].filter(Boolean).join(', ');

  return (
    <Page>
      <Link href="/whats-on" transitionTypes={['nav-back']} className="group mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-3 hover:text-ink">
        <ArrowLeft size={16} className="transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-translate-x-1" aria-hidden="true" /> What’s On
      </Link>

      {e.status === 'cancelled' ? (
        <div role="alert" className="mb-6 flex items-center gap-3 rounded-2xl bg-danger-soft px-5 py-4 text-danger">
          <AlertTriangle size={20} aria-hidden="true" /> This event has been cancelled by the organiser.
        </div>
      ) : ended || e.status === 'archived' ? (
        <div role="status" className="mb-6 flex items-center gap-3 rounded-2xl bg-sand px-5 py-4 text-ink-2">
          <Clock size={20} aria-hidden="true" /> This event has ended{e.status === 'archived' && !ended ? ' or is no longer listed by its source' : ''}.
        </div>
      ) : e.status !== 'published' ? (
        <div className="mb-6 rounded-2xl bg-sun-soft px-5 py-4 text-sm text-sun-deep">Admin preview — status: {e.status}</div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <ViewTransition name={`event-media-${e.id}`} share="morph" default="none">
          <div className="relative overflow-hidden rounded-[26px] border border-line">
            {e.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.image_url} alt="" className="aspect-[16/9] w-full object-cover" />
            ) : (
              <div className="aspect-[16/9]">
                <DatePanel event={e} category={cat} />
              </div>
            )}
          </div>
          </ViewTransition>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <CategoryPill category={cat} />
            {price ? <span className="tag tag-sea">{price}</span> : null}
            {e.featured ? <span className="tag tag-sun">Editor’s pick</span> : null}
          </div>
          <h1 className="display mt-3 text-[2.6rem] sm:text-5xl">
            <WordReveal delay={180}>{e.title}</WordReveal>
          </h1>
          {e.featured_note ? <p className="mt-4 rounded-2xl bg-sun-soft/70 px-4 py-3 text-ink-2">{e.featured_note}</p> : null}
          {e.description ? (
            <ExpandableText text={e.description} className="prose-sommr mt-6 max-w-2xl" />
          ) : (
            <p className="mt-6 text-ink-3">The organiser hasn’t shared a description. Check the ticket page for details.</p>
          )}
        </div>

        <aside className="stagger space-y-4" style={{ ['--stagger' as string]: '120ms' }}>
          <div className="card space-y-4 p-6" style={{ ['--i' as string]: 2 }}>
            <div className="flex items-start gap-3">
              <Clock size={19} className="mt-0.5 text-sun-deep" aria-hidden="true" />
              <div>
                <p className="font-semibold">{formatLongDate(e.starts_at)}</p>
                <p className="text-sm text-ink-3">
                  {e.all_day
                    ? multiDay
                      ? `Until ${formatLongDate(e.ends_at!)}`
                      : 'All day'
                    : `${formatTime(e.starts_at)}${e.ends_at ? ` – ${multiDay ? `${formatLongDate(e.ends_at)}, ` : ''}${formatTime(e.ends_at)}` : ''}`}
                </p>
              </div>
            </div>
            {location ? (
              <div className="flex items-start gap-3">
                <MapPin size={19} className="mt-0.5 text-sun-deep" aria-hidden="true" />
                <div>
                  <p className="font-semibold">{e.venue_name ?? 'Venue'}</p>
                  <p className="text-sm text-ink-3">{[e.address, city?.name].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
            ) : null}
            {e.organiser ? (
              <div className="flex items-start gap-3">
                <User size={19} className="mt-0.5 text-sun-deep" aria-hidden="true" />
                <p className="text-sm">
                  Hosted by <span className="font-semibold">{e.organiser}</span>
                </p>
              </div>
            ) : null}
            {e.ticket_url && !ended && e.status === 'published' ? (
              <div className="flex gap-2 pt-2">
                <a href={e.ticket_url} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-primary flex-1">
                  <Ticket size={17} aria-hidden="true" /> {e.is_free ? 'Event details' : 'Get tickets'}
                </a>
                <SaveButton saved={e.saved} onToggle={saveEventAction.bind(null, e.id)} label={e.title} />
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              {!(e.ticket_url && !ended && e.status === 'published') ? (
                <SaveButton saved={e.saved} onToggle={saveEventAction.bind(null, e.id)} label={e.title} size="sm" />
              ) : null}
              {!ended ? (
                <a href={`/api/events/${e.id}/ics`} className="btn btn-ghost btn-sm">
                  <CalendarPlus size={16} aria-hidden="true" /> Add to calendar
                </a>
              ) : null}
              <ShareButton title={e.title} className="btn btn-ghost btn-sm" />
              {e.lat != null && e.lng != null ? (
                <a href={directionsLinks(e.lat, e.lng).google} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                  <Navigation size={16} aria-hidden="true" /> Directions
                </a>
              ) : null}
            </div>
          </div>
          {e.lat != null && e.lng != null ? (
            <div style={{ ['--i' as string]: 3 }}>
              <MiniMap lat={e.lat} lng={e.lng} color={cat?.color} label={e.venue_name ?? e.title} />
            </div>
          ) : null}
          <p className="px-1 text-xs leading-relaxed text-ink-3">
            Listed by {e.source_name && ['ticketmaster', 'quicket', 'ical', 'jsonld'].includes(e.source) ? e.source_name : SOURCE_LABEL[e.source] ?? 'SOMMR'}
            {e.last_seen_at ? ` · checked ${timeAgo(e.last_seen_at)}` : ` · updated ${timeAgo(e.updated_at)}`}. Details can change — confirm with the organiser.
            {e.source_url && e.source_url !== e.ticket_url ? (
              <>
                {' '}
                <a href={e.source_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-0.5 underline">
                  Original listing <ExternalLink size={11} aria-hidden="true" />
                </a>
              </>
            ) : null}
          </p>
        </aside>
      </div>
    </Page>
  );
}
