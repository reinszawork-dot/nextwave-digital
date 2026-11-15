import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/ResetForms';

export const metadata: Metadata = { title: 'Choose a new password' };

export default async function ResetPasswordPage({ searchParams }: PageProps<'/reset-password'>) {
  const { token } = await searchParams;
  if (typeof token !== 'string' || !token) {
    return (
      <>
        <h1 className="display text-5xl">Link not valid</h1>
        <p className="mt-3 text-ink-3">This reset link is incomplete. Request a fresh one and use the newest email.</p>
        <Link href="/forgot-password" className="btn btn-primary mt-8 w-fit">
          Request a new link
        </Link>
      </>
    );
  }
  return (
    <>
      <h1 className="display text-5xl">Choose a new password</h1>
      <p className="mt-3 text-ink-3">You’ll be signed out everywhere else once it’s saved.</p>
      <div className="mt-8">
        <ResetPasswordForm token={token} />
      </div>
    </>
  );
}
