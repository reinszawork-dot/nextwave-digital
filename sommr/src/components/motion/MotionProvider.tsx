'use client';

import { LazyMotion, MotionConfig, domMax } from 'motion/react';

/**
 * Framer Motion, loaded once for the whole app with the lighter `m` components.
 * Used only where CSS can't do the job well: layout morphs (sliding indicators,
 * items moving between lists) and exit animations. Respects reduced motion.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.9 }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}

/** Shared springs so every moving part speaks the same language. */
export const SPRING = {
  snappy: { type: 'spring', stiffness: 520, damping: 40, mass: 0.8 },
  soft: { type: 'spring', stiffness: 260, damping: 30, mass: 1 },
  layout: { type: 'spring', stiffness: 400, damping: 36 },
} as const;
