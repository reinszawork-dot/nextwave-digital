'use client';

import { Share2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export function ShareButton({ title, text, className = 'btn btn-ghost' }: { title: string; text?: string; className?: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const url = window.location.href;
        try {
          if (navigator.share) await navigator.share({ title, text, url });
          else {
            await navigator.clipboard.writeText(url);
            toast('Link copied');
          }
        } catch {
          /* share sheet dismissed */
        }
      }}
    >
      <Share2 size={17} aria-hidden="true" /> Share
    </button>
  );
}
