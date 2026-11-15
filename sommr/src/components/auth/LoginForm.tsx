'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction, type FormState } from '@/app/(auth)/actions';
import { Field } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormAlert } from './FormAlert';

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <input type="hidden" name="next" value={next ?? '/'} />
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state.fields?.email} error={state.fieldErrors?.email} autoFocus />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required error={state.fieldErrors?.password} />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="link text-sm">
          Forgot your password?
        </Link>
      </div>
      <SubmitButton className="btn btn-primary btn-lg w-full" pendingText="Signing in">
        Sign in
      </SubmitButton>
    </form>
  );
}
