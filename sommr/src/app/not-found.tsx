import Link from 'next/link';
import { SunMark } from '@/components/ui/Logo';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="page-enter">
        <SunMark size={56} className="mx-auto" />
        <p className="eyebrow mt-6">404</p>
        <h1 className="display mt-2 text-5xl">This page went to the beach.</h1>
        <p className="mx-auto mt-3 max-w-md text-ink-3">It may have moved, ended or never existed. Let’s get you back to summer.</p>
        <Link href="/" className="btn btn-primary mt-8">
          Back home
        </Link>
      </div>
    </main>
  );
}
