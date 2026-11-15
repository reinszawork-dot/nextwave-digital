import type { Metadata } from 'next';
import Link from 'next/link';
import { RequestResetForm } from '@/components/auth/ResetForms';

export const metadata: Metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="display text-5xl">Forgot your password?</h1>
      <p className="mt-3 text-ink-3">Enter your email and we’ll send you a link to choose a new one.</p>
      <div className="mt-8">
        <RequestResetForm />
      </div>
      <p className="mt-8 text-center text-sm text-ink-3">
        <Link href="/login" className="link font-medium">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
