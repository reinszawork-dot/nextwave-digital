'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * A slim sunrise-coloured bar along the top while the next page loads. The
 * current page stays on screen (no full-page loaders), so navigation feels
 * continuous; the bar eases towards the end and completes when the route changes.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [p, setP] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const done = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);

  useEffect(() => {
    const start = () => {
      if (done.current) clearTimeout(done.current);
      active.current = true;
      setVisible(true);
      setP(0.12);
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(() => setP((x) => x + (0.92 - x) * 0.12), 280);
      // Never get stuck: give up gracefully after 12 seconds.
      done.current = setTimeout(finish, 12_000);
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      start();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
    // finish is stable for the component's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish() {
    if (!active.current) return;
    active.current = false;
    if (timer.current) clearInterval(timer.current);
    setP(1);
    done.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setP(0), 400);
    }, 320);
  }

  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  return <div className="nav-progress" aria-hidden="true" style={{ ['--p' as string]: p, opacity: visible ? 1 : 0 }} />;
}
