import Link from 'next/link';
import { Circle } from 'lucide-react';

export function BucketPreview({ items }: { items: { id: string; title: string }[] }) {
  return (
    <div className="mt-5 flex flex-1 flex-col">
      {items.length ? (
        <ul className="divide-y divide-line">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 py-2.5 text-[0.95rem]">
              <Circle size={16} className="shrink-0 text-line-strong" aria-hidden="true" />
              <span className="truncate">{i.title}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-3">Swim at sunrise, see a band outdoors, finally do that road trip — write it down.</p>
      )}
      <Link href="/my-summer/bucket-list" className="btn btn-soft mt-auto w-full translate-y-1">
        {items.length ? 'Open bucket list' : 'Start your list'}
      </Link>
    </div>
  );
}
