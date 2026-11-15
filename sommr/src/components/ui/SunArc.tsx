'use client';

import { useEffect, useState } from 'react';

/**
 * Bucket-list progress as a sun travelling across the sky: the arc fills and the
 * sun climbs as items are ticked off, reaching its zenith… and then setting gently
 * at 100% — a finished summer.
 */
export function SunArc({ done, total, width = 320 }: { done: number; total: number; width?: number }) {
  const progress = total > 0 ? done / total : 0;
  const [p, setP] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setP(progress);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 1400);
      const e = 1 - Math.pow(1 - k, 3);
      setP(progress * e);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  const h = width * 0.52;
  const cx = width / 2;
  const cy = h - 6;
  const r = width / 2 - 22;
  const angle = Math.PI * (1 - p); // 180° (left) → 0° (right)
  const sx = cx + r * Math.cos(angle);
  const sy = cy - r * Math.sin(angle);
  const arcLen = Math.PI * r;

  return (
    <svg
      viewBox={`0 0 ${width} ${h}`}
      width="100%"
      role="img"
      aria-label={`${done} of ${total} bucket list items done`}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="sunarc-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-sun-soft)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--color-paper)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="sunarc-glow">
          <stop offset="0%" stopColor="var(--color-sun)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-sun)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z`} fill="url(#sunarc-sky)" />
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="var(--color-line-strong)"
        strokeWidth="1.5"
        strokeDasharray="2 6"
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="var(--color-sun)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={arcLen}
        strokeDashoffset={arcLen * (1 - p)}
      />
      <circle cx={sx} cy={sy} r="26" fill="url(#sunarc-glow)" />
      <circle cx={sx} cy={sy} r="11" fill="var(--color-sun)" />
      <line x1="8" x2={width - 8} y1={cy} y2={cy} stroke="var(--color-sea)" strokeWidth="2" strokeLinecap="round" />
      <path
        d={`M 30 ${cy + 9} q 8 -4 16 0 t 16 0 M ${width - 62} ${cy + 9} q 8 -4 16 0 t 16 0`}
        fill="none"
        stroke="var(--color-sea)"
        strokeOpacity=".5"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
