'use client';

import { usePathname } from 'next/navigation';
import { ViewTransition } from 'react';

/**
 * For content inside a layout that stays mounted (admin pages, My Summer tabs):
 * keying on the path makes each navigation an exit + enter. `kind` picks the
 * animation class defined in globals.css ("page" or the quieter "tab").
 */
export function KeyedTransition({ children, kind = 'page' }: { children: React.ReactNode; kind?: 'page' | 'tab' }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter={kind} exit={kind} default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
