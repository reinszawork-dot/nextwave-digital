'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { m } from 'motion/react';
import { CalendarDays, Compass, House, Sun, Trophy, User } from 'lucide-react';
import { SPRING } from '@/components/motion/MotionProvider';

export const NAV = [
  { href: '/', label: 'Home', icon: House },
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/whats-on', label: 'What’s On?', short: 'What’s On', icon: CalendarDays },
  { href: '/challenges', label: 'Challenges', icon: Trophy },
  { href: '/my-summer', label: 'My Summer', icon: Sun },
  { href: '/profile', label: 'Profile', icon: User },
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return (
    pathname === href ||
    pathname.startsWith(href + '/') ||
    (href === '/explore' && pathname.startsWith('/places')) ||
    (href === '/whats-on' && pathname.startsWith('/events'))
  );
}

/** The highlight moves the moment you tap, not when the next page arrives. */
function useOptimisticPath() {
  const pathname = usePathname();
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => setPending(null), [pathname]);
  return [pending ?? pathname, setPending] as const;
}

export function SidebarNav() {
  const [path, setPending] = useOptimisticPath();
  return (
    <nav aria-label="Main" className="mt-10 flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(path, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setPending(href)}
            aria-current={active ? 'page' : undefined}
            className={`group relative flex h-11 items-center gap-3 rounded-2xl px-3.5 text-[0.95rem] font-medium transition-colors duration-300 ${
              active ? 'text-ink' : 'text-ink-2 hover:bg-sand/70 hover:text-ink'
            }`}
          >
            {active ? (
              <m.span layoutId="sidebar-pill" transition={SPRING.layout} className="absolute inset-0 rounded-2xl bg-paper shadow-[var(--shadow-card)]" aria-hidden="true" />
            ) : null}
            <Icon
              size={19}
              strokeWidth={active ? 2.1 : 1.8}
              className={`icon-wiggle relative transition-colors duration-300 ${active ? 'text-sun-deep' : 'text-ink-3 group-hover:text-ink-2'}`}
              aria-hidden="true"
            />
            <span className="relative">{label}</span>
            {active ? (
              <m.span layoutId="sidebar-dot" transition={SPRING.layout} className="absolute right-3 h-1.5 w-1.5 rounded-full bg-sun" aria-hidden="true" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const [path, setPending] = useOptimisticPath();
  const items = NAV.filter((n) => n.href !== '/profile');
  return (
    <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-line/80 bg-cream/85 backdrop-blur-xl backdrop-saturate-150 lg:hidden">
      <ul className="mx-auto flex h-[var(--bottom-nav-h)] max-w-lg items-stretch justify-around px-2">
        {items.map((item) => {
          const { href, label, icon: Icon } = item;
          const active = isActive(path, href);
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                onClick={() => setPending(href)}
                aria-current={active ? 'page' : undefined}
                className="group relative flex flex-1 flex-col items-center justify-center gap-1 text-[0.68rem] font-medium"
              >
                <span className="relative grid h-8 w-14 place-items-center">
                  {active ? (
                    <m.span layoutId="bottom-pill" transition={SPRING.layout} className="absolute inset-0 rounded-full bg-sun-soft" aria-hidden="true" />
                  ) : null}
                  <m.span className="relative" animate={active ? { y: [0, -3, 0] } : { y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
                    <Icon size={20} strokeWidth={active ? 2.1 : 1.8} className={`transition-colors duration-300 ${active ? 'text-sun-deep' : 'text-ink-3'}`} aria-hidden="true" />
                  </m.span>
                </span>
                <span className={`transition-colors duration-300 ${active ? 'text-ink' : 'text-ink-3'}`}>{'short' in item ? item.short : label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
