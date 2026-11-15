'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Segmented } from '@/components/ui/Segmented';

const TABS = [
  { value: '/my-summer', href: '/my-summer', label: 'Timeline' },
  { value: '/my-summer/bucket-list', href: '/my-summer/bucket-list', label: 'Bucket list' },
  { value: '/my-summer/saved', href: '/my-summer/saved', label: 'Saved' },
];

export function SummerTabs() {
  const path = usePathname();
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => setPending(null), [path]);
  return (
    <nav aria-label="My Summer sections">
      <Segmented id="summer-tabs" label="My Summer sections" items={TABS} value={pending ?? path} onChange={setPending} />
    </nav>
  );
}
