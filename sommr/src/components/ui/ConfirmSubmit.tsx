'use client';

import { useFormStatus } from 'react-dom';
import { useConfirm } from './Confirm';
import { Spinner } from './Spinner';

/** A submit button that asks for confirmation first (for destructive actions). */
export function ConfirmSubmit({ children, message, body, className = 'btn btn-danger btn-sm' }: { children: React.ReactNode; message: string; body?: string; className?: string }) {
  const { pending } = useFormStatus();
  const confirm = useConfirm();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={async (e) => {
        e.preventDefault();
        const button = e.currentTarget;
        if (await confirm({ title: message, body, confirmLabel: 'Delete' })) button.form?.requestSubmit(button);
      }}
    >
      {pending ? <Spinner /> : null}
      {children}
    </button>
  );
}
