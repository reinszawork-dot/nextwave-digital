import type { Metadata } from 'next';
import Link from 'next/link';
import { ViewTransition } from 'react';
import { WordReveal } from '@/components/motion/WordReveal';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Trash2 } from 'lucide-react';
import { Page } from '@/components/shell/AppShell';
import { ConfirmSubmit } from '@/components/ui/ConfirmSubmit';
import { formatLongDate } from '@/lib/time';
import { deleteMemoryAction } from '@/server/actions/memories';
import { requireUser } from '@/server/auth';
import { getMemory } from '@/server/services/memories';

export const metadata: Metadata = { title: 'Memory' };

export default async function MemoryPage({ params, searchParams }: PageProps<'/my-summer/memories/[id]'>) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const user = await requireUser({ next: `/my-summer/memories/${id}` });
  const m = await getMemory(user.id, id);
  if (!m) notFound();
  return (
    <Page>
      <div className="mx-auto max-w-3xl">
        <Link href="/my-summer" transitionTypes={['nav-back']} className="group mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-3 hover:text-ink">
          <ArrowLeft size={16} className="transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-translate-x-1" aria-hidden="true" /> My Summer
        </Link>
        {isNew === '1' ? (
          <p role="status" className="mb-6 rounded-2xl bg-leaf-soft px-4 py-3 text-sm text-[#436b39]">
            Saved to your summer. ☀️
          </p>
        ) : null}
        <p className="eyebrow">{formatLongDate(new Date(`${m.happened_on}T12:00:00+02:00`))}</p>
        <h1 className="display mt-2 text-5xl">
          <WordReveal delay={160}>{m.title}</WordReveal>
        </h1>
        {m.place_name ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-ink-3">
            <MapPin size={16} aria-hidden="true" />
            {m.place_id ? (
              <Link href={`/places/${m.place_id}`} className="link">
                {m.place_name}
              </Link>
            ) : (
              m.place_name
            )}
          </p>
        ) : null}
        {m.photo_ids.length ? (
          <div className={`mt-8 grid gap-3 ${m.photo_ids.length > 1 ? 'sm:grid-cols-2' : ''}`}>
            {m.photo_ids.map((pid, i) => {
              const img = (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={pid} src={`/api/media/${pid}`} alt={`Photo ${i + 1} of ${m.title}`} className={`w-full rounded-[22px] object-cover ${m.photo_ids.length > 1 && i === 0 ? 'sm:col-span-2' : ''}`} />
              );
              return i === 0 ? (
                <ViewTransition key={pid} name={`memory-photo-${m.id}`} share="morph" default="none">
                  {img}
                </ViewTransition>
              ) : (
                <div key={pid} data-reveal="image" style={{ ['--i' as string]: i }} className="overflow-hidden rounded-[22px]">
                  {img}
                </div>
              );
            })}
          </div>
        ) : null}
        {m.body ? <p className="prose-sommr mt-8 whitespace-pre-line text-lg">{m.body}</p> : null}
        <form action={deleteMemoryAction.bind(null, m.id)} className="mt-12 border-t border-line pt-6">
          <ConfirmSubmit message="Delete this memory?" body="Its photos will be deleted too. This can’t be undone.">
            <Trash2 size={15} aria-hidden="true" /> Delete this memory
          </ConfirmSubmit>
        </form>
      </div>
    </Page>
  );
}
