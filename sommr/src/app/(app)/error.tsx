'use client';

import { useEffect } from 'react';
import { CloudRain } from 'lucide-react';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div className="page-enter max-w-md">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sea-soft text-sea-deep">
          <CloudRain size={24} aria-hidden="true" />
        </span>
        <h1 className="display mt-5 text-4xl">A passing cloud</h1>
        <p className="mt-3 text-ink-3">Something went wrong loading this page. It’s usually temporary — try again in a moment.</p>
        {error.digest ? <p className="mt-2 text-xs text-ink-3">Reference: {error.digest}</p> : null}
        <button type="button" onClick={reset} className="btn btn-primary mt-7">
          Try again
        </button>
      </div>
    </main>
  );
}
