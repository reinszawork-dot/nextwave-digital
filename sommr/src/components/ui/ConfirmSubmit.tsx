'use client';

import { useFormStatus } from 'react-dom';
import { Spinner } from './Spinner';

/** A submit button that asks for confirmation first (for destructive actions). */
export function ConfirmSubmit({ children, message, className = 'btn btn-danger btn-sm' }: { children: React.ReactNode; message: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {pending ? <Spinner /> : null}
      {children}
    </button>
  );
}
