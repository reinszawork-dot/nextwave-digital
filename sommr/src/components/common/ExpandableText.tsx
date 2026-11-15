'use client';

import { m } from 'motion/react';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SPRING } from '@/components/motion/MotionProvider';

/** Long text shows a preview that fades out, and expands smoothly on request. */
export function ExpandableText({ text, collapsedHeight = 230, className = '' }: { text: string; collapsedHeight?: number; className?: string }) {
  const [open, setOpen] = useState(false);
  const paragraphs = text.split(/\n{2,}/).map((p, i) => (
    <p key={i} className="whitespace-pre-line">
      {p}
    </p>
  ));
  if (text.length < 700) return <div className={className}>{paragraphs}</div>;
  return (
    <div className={className}>
      <m.div
        initial={false}
        animate={{ height: open ? 'auto' : collapsedHeight }}
        transition={SPRING.soft}
        className="relative overflow-hidden"
        style={open ? undefined : { maskImage: 'linear-gradient(to bottom, black 55%, transparent)' }}
      >
        {paragraphs}
      </m.div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="group mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-sea-deep">
        {open ? 'Show less' : 'Read more'}
        <ChevronDown size={16} className={`transition-transform duration-500 ease-[var(--ease-spring)] ${open ? 'rotate-180' : 'group-hover:translate-y-0.5'}`} aria-hidden="true" />
      </button>
    </div>
  );
}
