'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

/** Heart toggle with optimistic UI. `onToggle` is a server action. */
export function SaveButton({
  saved,
  onToggle,
  label,
  className = '',
  size = 'md',
}: {
  saved: boolean;
  onToggle: (next: boolean) => Promise<{ ok: boolean; error?: string }>;
  label: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, start] = useTransition();
  const toast = useToast();
  const [burst, setBurst] = useState(0);
  const dim = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  return (
    <button
      type="button"
      aria-pressed={optimistic}
      aria-label={optimistic ? `Remove ${label} from saved` : `Save ${label}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = !optimistic;
        if (next) setBurst((b) => b + 1);
        start(async () => {
          setOptimistic(next);
          const r = await onToggle(next);
          if (!r.ok) toast(r.error ?? 'Couldn’t save that.', { tone: 'error' });
          else if (next) toast('Saved', { detail: 'Find it in My Summer → Saved.' });
        });
      }}
      className={`group relative grid ${dim} shrink-0 place-items-center rounded-full border border-line bg-paper/90 backdrop-blur transition-[transform,background-color,border-color] duration-300 hover:scale-105 hover:border-sun/40 active:scale-95 ${className}`}
    >
      {burst ? <span key={burst} className="ripple" aria-hidden="true" /> : null}
      <Heart
        key={`h${burst}`}
        size={size === 'sm' ? 16 : 19}
        className={`transition-colors duration-300 ${optimistic ? `fill-sun text-sun ${burst ? 'heart-beat' : ''}` : 'text-ink-2 group-hover:text-sun-deep'}`}
        aria-hidden="true"
      />
    </button>
  );
}
