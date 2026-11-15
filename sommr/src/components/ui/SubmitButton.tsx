'use client';

import { useFormStatus } from 'react-dom';
import { Spinner } from './Spinner';

export function SubmitButton({
  children,
  className = 'btn btn-primary',
  pendingText,
  disabled,
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-busy={pending} name={name} value={value}>
      {pending ? (
        <>
          <Spinner />
          {pendingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
