'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/submissions', label: 'Submissions' },
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/sources', label: 'Imports' },
  { href: '/admin/places', label: 'Places' },
  { href: '/admin/challenges', label: 'Challenges' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/featured', label: 'Featured' },
  { href: '/admin/users', label: 'Users' },
];

export function AdminNav({ pending }: { pending: number }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="scroller !gap-1.5 pb-1">
      {ITEMS.map((i) => {
        const active = i.href === '/admin' ? path === '/admin' : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? 'page' : undefined} className="chip">
            {i.label}
            {i.href === '/admin/submissions' && pending > 0 ? (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-sun px-1 text-[0.7rem] font-semibold text-white">{pending}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
