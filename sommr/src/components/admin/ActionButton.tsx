'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';

/** Runs a bound server action, shows a spinner and a toast with any returned message. */
export function ActionButton({
  action,
  children,
  className = 'btn btn-ghost btn-sm',
  confirm,
  success,
}: {
  action: () => Promise<unknown>;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  success?: string;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          try {
            const r = (await action()) as { message?: string; status?: string } | undefined;
            const msg = r?.message ?? success;
            if (msg) toast(msg, { tone: r?.status && r.status !== 'ok' ? 'error' : 'success' });
            router.refresh();
          } catch (err) {
            if (err && typeof err === 'object' && 'digest' in err && String((err as { digest: string }).digest).startsWith('NEXT_REDIRECT')) throw err;
            toast('That didn’t work. Please try again.', { tone: 'error' });
          }
        });
      }}
    >
      {pending ? <Spinner /> : null}
      {children}
    </button>
  );
}
