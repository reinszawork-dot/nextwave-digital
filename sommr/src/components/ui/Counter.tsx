'use client';

import { useEffect, useRef, useState } from 'react';

/** Counts up to `value` when it scrolls into view (instantly with reduced motion). */
export function Counter({ value, duration = 1100, className }: { value: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setShown(value);
      from.current = value;
      return;
    }
    let raf = 0;
    const start = () => {
      const t0 = performance.now();
      const a = from.current;
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 4);
        setShown(Math.round(a + (value - a) * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
        else from.current = value;
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          start();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      <span aria-hidden="true">{shown.toLocaleString('en-ZA')}</span>
      <span className="sr-only">{value.toLocaleString('en-ZA')}</span>
    </span>
  );
}
