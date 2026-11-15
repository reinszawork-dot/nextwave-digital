'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';
import { Check, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { BUCKET_SUGGESTIONS } from '@/lib/bucket-suggestions';
import { INTERESTS } from '@/lib/interests';
import { PHOTOS } from '@/lib/photos';
import { addBucketAction } from '@/server/actions/activity';

/** Bucket-list ideas that match the user's interests, one per interest, with a photo. */
export function Recommendations({ interests, existing }: { interests: string[]; existing: string[] }) {
  const toast = useToast();
  const [added, setAdded] = useState<string[]>(existing);
  const [pending, start] = useTransition();
  // Round-robin through the user's interests, then everything else, until we have four ideas.
  const order = [...interests, ...INTERESTS.map((i) => i.slug).filter((s) => !interests.includes(s))];
  const pools = order.map((slug) => BUCKET_SUGGESTIONS.filter((s) => s.interest === slug && !existing.includes(s.slug)));
  const picks: (typeof BUCKET_SUGGESTIONS)[number][] = [];
  for (let round = 0; picks.length < 4 && round < 4; round++) {
    for (const pool of pools.slice(0, Math.max(interests.length, 1) + (round > 0 ? order.length : 0))) {
      if (pool[round] && !picks.includes(pool[round])) picks.push(pool[round]);
      if (picks.length === 4) break;
    }
  }
  if (picks.length === 0) return <p className="text-ink-3">You’ve added all our ideas for your interests. Nice.</p>;
  return (
    <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {picks.map((s, i) => {
        const interest = INTERESTS.find((it) => it.slug === s.interest)!;
        const photo = PHOTOS[interest.photo];
        const isAdded = added.includes(s.slug);
        return (
          <article key={s.slug} className="group relative h-56 overflow-hidden rounded-[22px] text-white shadow-[var(--shadow-card)]" style={{ ['--i' as string]: i }}>
            <Image src={photo.src} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
              <div>
                <p className="text-xs font-medium text-white/75">{interest.label}</p>
                <h3 className="display mt-1 text-[1.55rem] leading-[1.05]">{s.title}</h3>
              </div>
              <button
                type="button"
                disabled={isAdded || pending}
                aria-label={isAdded ? `${s.title} is on your bucket list` : `Add ${s.title} to your bucket list`}
                onClick={() =>
                  start(async () => {
                    const r = await addBucketAction({ title: s.title, suggestion: s.slug });
                    if (!r.ok) return toast(r.error, { tone: 'error' });
                    setAdded((a) => [...a, s.slug]);
                    toast('Added to your bucket list', { detail: r.earned.length ? `New badge: ${r.earned[0].title}` : undefined });
                  })
                }
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-all duration-300 ${
                  isAdded ? 'bg-leaf text-white' : 'bg-white/90 text-ink hover:scale-105 hover:bg-white'
                }`}
              >
                {isAdded ? <Check size={18} strokeWidth={2.5} aria-hidden="true" /> : <Plus size={18} strokeWidth={2.5} aria-hidden="true" />}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
