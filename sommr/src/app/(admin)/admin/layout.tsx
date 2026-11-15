import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AdminNav } from '@/components/admin/AdminNav';
import { Logo } from '@/components/ui/Logo';
import { requireAdmin } from '@/server/auth';
import { maybeOne, sql } from '@/server/db';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · SOMMR Admin' }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const pending = await maybeOne<{ n: number }>(sql`
    select ((select count(*) from events where status = 'pending') + (select count(*) from places where status = 'pending'))::int as n`);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur-xl">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" aria-label="Admin home">
                <Logo />
              </Link>
              <span className="tag tag-sea">Admin</span>
            </div>
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-3 hover:text-ink">
              <ArrowLeft size={15} aria-hidden="true" /> Back to app
            </Link>
          </div>
          <div className="pb-3">
            <AdminNav pending={pending?.n ?? 0} />
          </div>
        </div>
      </header>
      <main className="page-enter mx-auto max-w-[1240px] px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
