'use client';

import { useActionState } from 'react';
import { changePassword, deleteAccount, type PasswordState } from '@/server/actions/profile';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function ChangePasswordForm() {
  const [state, action] = useActionState<PasswordState, FormData>(changePassword, {});
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="field-label" htmlFor="pw-current">
          Current password
        </label>
        <input id="pw-current" name="current" type="password" autoComplete="current-password" className="input" required />
      </div>
      <div>
        <label className="field-label" htmlFor="pw-new">
          New password
        </label>
        <input id="pw-new" name="password" type="password" autoComplete="new-password" minLength={10} className="input" required />
        <p className="field-hint">At least 10 characters.</p>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="text-sm text-leaf">
          Password updated.
        </p>
      ) : null}
      <SubmitButton className="btn btn-ghost" pendingText="Updating">
        Update password
      </SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState<PasswordState, FormData>(deleteAccount, {});
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-ink-3">
        This permanently deletes your account, memories, photos, bucket list and history. It can’t be undone.
      </p>
      <div className="max-w-xs">
        <label className="field-label" htmlFor="del-confirm">
          Type DELETE to confirm
        </label>
        <input id="del-confirm" name="confirm" className="input" autoComplete="off" />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton className="btn btn-danger" pendingText="Deleting">
        Delete my account
      </SubmitButton>
    </form>
  );
}
