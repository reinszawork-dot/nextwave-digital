'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/my-summer', label: 'Timeline' },
  { href: '/my-summer/bucket-list', label: 'Bucket list' },
  { href: '/my-summer/saved', label: 'Saved' },
];

export function SummerTabs() {
  const path = usePathname();
  return (
    <nav aria-label="My Summer sections" className="segmented">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={path === t.href ? 'page' : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
