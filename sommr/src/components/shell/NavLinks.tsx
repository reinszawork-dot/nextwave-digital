'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Compass, House, Sun, Trophy, User } from 'lucide-react';

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
  return pathname === href || pathname.startsWith(href + '/') ||
    (href === '/explore' && pathname.startsWith('/places')) ||
    (href === '/whats-on' && pathname.startsWith('/events'));
}

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="mt-10 flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`group relative flex h-11 items-center gap-3 rounded-2xl px-3.5 text-[0.95rem] font-medium transition-all duration-300 ${
              active ? 'bg-paper text-ink shadow-[var(--shadow-card)]' : 'text-ink-2 hover:bg-sand hover:text-ink'
            }`}
          >
            <Icon size={19} strokeWidth={active ? 2.1 : 1.8} className={active ? 'text-sun-deep' : 'text-ink-3 group-hover:text-ink-2'} aria-hidden="true" />
            {label}
            {active ? <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-sun" aria-hidden="true" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const items = NAV.filter((n) => n.href !== '/profile');
  return (
    <nav
      aria-label="Main"
      className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-line/80 bg-cream/85 backdrop-blur-xl backdrop-saturate-150 lg:hidden"
    >
      <ul className="mx-auto flex h-[var(--bottom-nav-h)] max-w-lg items-stretch justify-around px-2">
        {items.map((item) => {
          const { href, label, icon: Icon } = item;
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className="relative flex flex-1 flex-col items-center justify-center gap-1 text-[0.68rem] font-medium"
              >
                <span
                  className={`grid h-8 w-14 place-items-center rounded-full transition-all duration-300 ${
                    active ? 'bg-sun-soft text-sun-deep' : 'text-ink-3'
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.1 : 1.8} aria-hidden="true" />
                </span>
                <span className={active ? 'text-ink' : 'text-ink-3'}>{'short' in item ? item.short : label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
