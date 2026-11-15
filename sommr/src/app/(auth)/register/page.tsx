import type { Metadata } from 'next';
import Link from 'next/link';
import { WordReveal } from '@/components/motion/WordReveal';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = { title: 'Create your account' };

export default function RegisterPage() {
  return (
    <>
      <p className="eyebrow">Join SOMMR</p>
      <h1 className="display mt-2 text-5xl">
        <WordReveal>
          Make this summer <em className="text-sun-deep">count</em>.
        </WordReveal>
      </h1>
      <p className="mt-3 text-ink-3">Free, and it takes a minute. Next we’ll ask for your city and what you love.</p>
      <div className="mt-8">
        <RegisterForm />
      </div>
      <p className="mt-8 text-center text-sm text-ink-3">
        Already have an account?{' '}
        <Link href="/login" className="link font-medium">
          Sign in
        </Link>
      </p>
    </>
  );
}
