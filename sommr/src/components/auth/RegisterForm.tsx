'use client';

import { useActionState } from 'react';
import { registerAction, type FormState } from '@/app/(auth)/actions';
import { Field } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormAlert } from './FormAlert';

export function RegisterForm() {
  const [state, action] = useActionState<FormState, FormData>(registerAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <Field label="First name" name="name" autoComplete="given-name" required maxLength={60} defaultValue={state.fields?.name} error={state.fieldErrors?.name} autoFocus />
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state.fields?.email} error={state.fieldErrors?.email} />
      <Field label="Password" name="password" type="password" autoComplete="new-password" required minLength={10} hint="At least 10 characters. A short phrase works well." error={state.fieldErrors?.password} />
      <SubmitButton className="btn btn-primary btn-lg w-full" pendingText="Creating your account">
        Create account
      </SubmitButton>
    </form>
  );
}
