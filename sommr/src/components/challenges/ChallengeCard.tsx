'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Camera, Check, Compass, Lightbulb, Shuffle, Undo2 } from 'lucide-react';
import { Celebrate } from '@/components/common/Celebrate';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { completeChallengeAction, swapChallengeAction, undoChallengeAction } from '@/server/actions/activity';

export interface ChallengeView {
  id: string;
  period: 'daily' | 'weekly';
  status: 'assigned' | 'completed';
  swapsLeft: number;
  title: string;
  description: string;
  tip: string | null;
  cost: 'free' | 'low' | 'medium';
  points: number;
  placeCategory: string | null;
  placeCategoryLabel: string | null;
}

const COST: Record<ChallengeView['cost'], string> = { free: 'Free', low: 'Low cost', medium: 'Treat yourself' };

export function ChallengeCard({ c, variant = 'hero', daysLeft }: { c: ChallengeView; variant?: 'hero' | 'compact'; daysLeft?: number }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [action, setAction] = useState<'complete' | 'swap' | 'undo' | null>(null);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const done = c.status === 'completed';
  const hero = variant === 'hero';

  const run = (kind: 'complete' | 'swap' | 'undo') => {
    setAction(kind);
    start(async () => {
      if (kind === 'complete') {
        const r = await completeChallengeAction(c.id);
        if (!r.ok) return toast(r.error, { tone: 'error' });
        setCelebrate(`+${r.points} points`);
        setTimeout(() => setCelebrate(null), 1600);
        toast(`Done! +${r.points} points`, { detail: r.earned.length ? `New badge: ${r.earned.map((e) => e.title).join(', ')}` : 'Add a photo or note to remember it.' });
      } else if (kind === 'swap') {
        const r = await swapChallengeAction(c.period);
        if (!r.ok) return toast(r.error, { tone: 'error' });
        toast('Swapped', { detail: r.title ? `New challenge: ${r.title}` : undefined });
      } else {
        const r = await undoChallengeAction(c.id);
        if (!r.ok) return toast(r.error, { tone: 'error' });
        toast('Marked as not done');
      }
    });
  };

  return (
    <article
      className={`relative overflow-hidden ${hero ? 'rounded-[26px] border border-[#efd8c4] p-6 sm:p-8' : 'card p-5'}`}
      style={hero ? { background: 'linear-gradient(150deg, #fff6ec 0%, #fdeedf 55%, #f8e3cf 100%)' } : undefined}
      aria-labelledby={`ch-${c.id}`}
    >
      <Celebrate show={!!celebrate} label={celebrate ?? undefined} />
      {hero ? (
        <svg className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 text-sun opacity-[0.13]" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="22" fill="currentColor" />
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x="48.5" y="8" width="3" height="14" rx="1.5" fill="currentColor" transform={`rotate(${i * 30} 50 50)`} />
          ))}
        </svg>
      ) : null}

      <div className="relative flex flex-wrap items-center gap-2">
        <span className={`tag ${hero ? '!bg-white/70' : ''} !text-sun-deep`}>
          {c.period === 'daily' ? 'Today’s challenge' : 'This week'}
        </span>
        <span className={`tag ${hero ? '!bg-white/70' : ''}`}>{COST[c.cost]}</span>
        <span className={`tag ${hero ? '!bg-white/70' : ''}`}>{c.points} pts</span>
        {daysLeft != null && !done ? (
          <span className={`tag ${hero ? '!bg-white/70' : ''}`}>{daysLeft === 1 ? 'Last day' : `${daysLeft} days left`}</span>
        ) : null}
      </div>

      <h3 id={`ch-${c.id}`} className={`display relative mt-4 ${hero ? 'text-[2.2rem] sm:text-[2.7rem]' : 'text-[1.7rem]'} ${done ? 'text-ink-2' : ''}`}>
        {c.title}
      </h3>
      <p className={`relative mt-2 max-w-xl ${hero ? 'text-[1.02rem]' : 'text-[0.95rem]'} leading-relaxed text-ink-2`}>{c.description}</p>
      {c.tip && hero && !done ? (
        <p className="relative mt-3 flex max-w-xl items-start gap-2 text-sm text-ink-3">
          <Lightbulb size={16} className="mt-0.5 shrink-0 text-sun-deep" aria-hidden="true" /> {c.tip}
        </p>
      ) : null}

      <div className="relative mt-6 flex flex-wrap items-center gap-2">
        {done ? (
          <>
            <span className="inline-flex h-11 items-center gap-2 rounded-full bg-leaf px-5 text-sm font-semibold text-white pop-in">
              <Check size={18} strokeWidth={2.6} aria-hidden="true" /> Done · +{c.points}
            </span>
            <Link href={`/my-summer/new?challenge=${c.id}`} className="btn btn-ghost">
              <Camera size={17} aria-hidden="true" /> Add a memory
            </Link>
            <button type="button" className="btn btn-sm text-ink-3 hover:text-ink" onClick={() => run('undo')} disabled={pending}>
              {pending && action === 'undo' ? <Spinner /> : <Undo2 size={15} aria-hidden="true" />} Undo
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-primary" onClick={() => run('complete')} disabled={pending}>
              {pending && action === 'complete' ? <Spinner /> : <Check size={18} strokeWidth={2.4} aria-hidden="true" />}
              Mark as done
            </button>
            {c.placeCategory ? (
              <Link href={`/explore?category=${c.placeCategory}`} className="btn btn-ghost">
                <Compass size={17} aria-hidden="true" /> Find {c.placeCategoryLabel?.toLowerCase() ?? 'a spot'}
              </Link>
            ) : null}
            <button
              type="button"
              className="btn btn-sm text-ink-3 hover:text-ink"
              onClick={() => run('swap')}
              disabled={pending || c.swapsLeft <= 0}
              title={c.swapsLeft <= 0 ? 'No swaps left' : `${c.swapsLeft} swap${c.swapsLeft === 1 ? '' : 's'} left`}
            >
              {pending && action === 'swap' ? <Spinner /> : <Shuffle size={15} aria-hidden="true" />}
              {c.swapsLeft > 0 ? 'Swap' : 'No swaps left'}
            </button>
          </>
        )}
      </div>
    </article>
  );
}
