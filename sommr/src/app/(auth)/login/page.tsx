import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next } = await searchParams;
  return (
    <>
      <p className="eyebrow">Welcome back</p>
      <h1 className="display mt-2 text-5xl">Sign in</h1>
      <p className="mt-3 text-ink-3">Pick up where you left off — your challenges, places and memories are waiting.</p>
      <div className="mt-8">
        <LoginForm next={typeof next === 'string' ? next : undefined} />
      </div>
      <p className="mt-8 text-center text-sm text-ink-3">
        New to SOMMR?{' '}
        <Link href="/register" className="link font-medium">
          Create an account
        </Link>
      </p>
    </>
  );
}
