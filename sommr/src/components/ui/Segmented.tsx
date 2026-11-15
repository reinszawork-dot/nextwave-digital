'use client';

import Link from 'next/link';
import { m } from 'motion/react';
import { SPRING } from '@/components/motion/MotionProvider';

/** Segmented control whose white "thumb" glides to the selected option. */
export interface SegmentItem {
  value: string;
  label: React.ReactNode;
  href?: string;
}

export function Segmented({
  id,
  items,
  value,
  onChange,
  label,
  className = '',
}: {
  id: string;
  items: SegmentItem[];
  value: string;
  onChange?: (value: string) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={`segmented ${className}`} data-pill="" role={items.some((i) => i.href) ? undefined : 'group'} aria-label={label}>
      {items.map((it) => {
        const active = it.value === value;
        const thumb = active ? (
          <m.span layoutId={`seg-${id}`} transition={SPRING.layout} className="absolute inset-0 -z-10 rounded-full bg-paper shadow-[0_1px_2px_rgb(31_28_24/0.08),0_4px_12px_-6px_rgb(31_28_24/0.2)]" aria-hidden="true" />
        ) : null;
        return it.href ? (
          <Link key={it.value} href={it.href} aria-current={active ? 'page' : undefined} onClick={() => onChange?.(it.value)} className={active ? 'text-ink' : ''}>
            {thumb}
            {it.label}
          </Link>
        ) : (
          <button key={it.value} type="button" aria-pressed={active} onClick={() => onChange?.(it.value)} className={active ? 'text-ink' : ''}>
            {thumb}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
