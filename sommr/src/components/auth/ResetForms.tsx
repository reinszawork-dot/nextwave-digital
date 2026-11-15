'use client';

import { useActionState } from 'react';
import { requestResetAction, resetPasswordAction, type FormState } from '@/app/(auth)/actions';
import { Field } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormAlert } from './FormAlert';

export function RequestResetForm() {
  const [state, action] = useActionState<FormState, FormData>(requestResetAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      {!state.ok && (
        <>
          <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state.fields?.email} error={state.fieldErrors?.email} autoFocus />
          <SubmitButton className="btn btn-primary btn-lg w-full" pendingText="Sending">
            Send reset link
          </SubmitButton>
        </>
      )}
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(resetPasswordAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <input type="hidden" name="token" value={token} />
      <Field label="New password" name="password" type="password" autoComplete="new-password" required minLength={10} hint="At least 10 characters." error={state.fieldErrors?.password} autoFocus />
      <SubmitButton className="btn btn-primary btn-lg w-full" pendingText="Saving">
        Save new password
      </SubmitButton>
    </form>
  );
}
