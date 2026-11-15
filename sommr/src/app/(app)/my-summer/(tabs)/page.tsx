import type { Metadata } from 'next';
import Link from 'next/link';
import { Camera, Check, ListChecks, MapPin, Trophy } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatShortDate, saParts } from '@/lib/time';
import { requireUser } from '@/server/auth';
import { timeline, type TimelineItem } from '@/server/services/memories';

export const metadata: Metadata = { title: 'My Summer' };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function Photos({ ids }: { ids: string[] }) {
  if (!ids.length) return null;
  const shown = ids.slice(0, 4);
  return (
    <div className={`grid gap-1.5 overflow-hidden rounded-2xl ${shown.length === 1 ? '' : 'grid-cols-2'}`}>
      {shown.map((id, i) => (
        // Private photos are served by our own authenticated endpoint.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={id}
          src={`/api/media/${id}?size=thumb`}
          alt=""
          loading="lazy"
          className={`w-full object-cover ${shown.length === 1 ? 'aspect-[4/3]' : shown.length === 3 && i === 0 ? 'row-span-2 h-full' : 'aspect-square'}`}
        />
      ))}
    </div>
  );
}

function Entry({ item }: { item: TimelineItem }) {
  if (item.type === 'memory') {
    const m = item.memory;
    return (
      <Link href={`/my-summer/memories/${m.id}`} className="card card-hover block overflow-hidden p-3 sm:p-4">
        <Photos ids={m.photo_ids} />
        <div className={m.photo_ids.length ? 'px-1 pb-1 pt-3' : 'p-1'}>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
            <span>{formatShortDate(new Date(`${m.happened_on}T12:00:00+02:00`))}</span>
            {m.place_name ? (
              <span className="inline-flex items-center gap-1">
                · <MapPin size={12} aria-hidden="true" /> {m.place_name}
              </span>
            ) : null}
            {m.kind === 'challenge' ? <span className="tag tag-sun !h-5">Challenge</span> : null}
            {m.kind === 'bucket' ? <span className="tag tag-leaf !h-5">Bucket list</span> : null}
          </div>
          <h3 className="display mt-1 text-[1.6rem] leading-tight">{m.title}</h3>
          {m.body ? <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-ink-2">{m.body}</p> : null}
        </div>
      </Link>
    );
  }
  const meta =
    item.type === 'challenge'
      ? { icon: Trophy, label: `${item.period === 'weekly' ? 'Weekly' : 'Daily'} challenge · +${item.points}`, title: item.title, href: `/my-summer/new?challenge=${item.id}`, tone: 'bg-sun-soft text-sun-deep' }
      : item.type === 'visit'
        ? { icon: MapPin, label: 'Visited', title: item.name, href: `/places/${item.placeId}`, tone: 'bg-sea-soft text-sea-deep' }
        : { icon: ListChecks, label: 'Bucket list', title: item.title, href: `/my-summer/new?bucket=${item.id}`, tone: 'bg-leaf-soft text-leaf' };
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-3 rounded-2xl px-2 py-2.5">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${meta.tone}`}>
        <Icon size={16} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.95rem] font-medium">{meta.title}</p>
        <p className="text-xs text-ink-3">
          {meta.label} · {formatShortDate(item.at)}
        </p>
      </div>
      {item.type !== 'visit' ? (
        <Link href={meta.href} className="btn btn-sm text-ink-3 hover:bg-sand hover:text-ink" aria-label={`Add a photo or note to ${meta.title}`}>
          <Camera size={15} aria-hidden="true" /> <span className="hidden sm:inline">Add photo</span>
        </Link>
      ) : (
        <Check size={16} className="text-leaf" aria-hidden="true" />
      )}
    </div>
  );
}

export default async function MySummerPage() {
  const user = await requireUser({ next: '/my-summer' });
  const items = await timeline(user.id);
  if (items.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={Camera}
          title="Your summer story starts here"
          action={
            <Link href="/my-summer/new" className="btn btn-primary">
              Add your first memory
            </Link>
          }
        >
          Add photos and notes, complete challenges and mark places as visited — they’ll all appear here as a timeline of your summer.
        </EmptyState>
      </div>
    );
  }
  const months = new Map<string, TimelineItem[]>();
  for (const it of items) {
    const [y, m] = it.date.split('-').map(Number);
    const key = `${MONTHS[m - 1]} ${y === saParts().year ? '' : y}`.trim();
    months.set(key, [...(months.get(key) ?? []), it]);
  }
  return (
    <div className="space-y-12">
      {[...months.entries()].map(([month, list]) => {
        const memories = list.filter((i) => i.type === 'memory');
        const moments = list.filter((i) => i.type !== 'memory');
        return (
          <section key={month} aria-labelledby={`m-${month}`}>
            <h2 id={`m-${month}`} className="display mb-5 text-[2.2rem]">
              {month}
            </h2>
            <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
              <div className="stagger columns-1 gap-4 sm:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
                {memories.map((it, i) => (
                  <div key={i} style={{ ['--i' as string]: Math.min(i, 8) }}>
                    <Entry item={it} />
                  </div>
                ))}
                {memories.length === 0 ? <p className="text-sm text-ink-3">No photo memories this month yet.</p> : null}
              </div>
              {moments.length ? (
                <div className="card h-fit p-3">
                  <p className="eyebrow px-2 pb-1 pt-2">Moments</p>
                  {moments.map((it, i) => (
                    <Entry key={i} item={it} />
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
