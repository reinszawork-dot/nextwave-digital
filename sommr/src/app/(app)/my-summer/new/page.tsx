import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Page } from '@/components/shell/AppShell';
import { MemoryForm } from '@/components/summer/MemoryForm';
import { dateKey } from '@/lib/time';
import { requireUser } from '@/server/auth';
import { maybeOne, sql } from '@/server/db';

export const metadata: Metadata = { title: 'Add a memory' };

export default async function NewMemoryPage({ searchParams }: PageProps<'/my-summer/new'>) {
  const user = await requireUser({ next: '/my-summer/new' });
  const sp = await searchParams;
  const id = (k: string) => (typeof sp[k] === 'string' && /^[0-9a-f-]{36}$/i.test(sp[k] as string) ? (sp[k] as string) : '');
  const today = dateKey();
  let title = '';
  let context: string | null = null;
  let happenedOn = today;
  let placeName = '';
  const challengeId = id('challenge');
  const bucketId = id('bucket');
  const placeId = id('place');
  if (challengeId) {
    const c = await maybeOne<{ title: string; completed_at: Date | null }>(sql`
      select c.title, uc.completed_at from user_challenges uc join challenges c on c.id = uc.challenge_id
      where uc.id = ${challengeId} and uc.user_id = ${user.id}`);
    if (c) {
      title = c.title;
      context = `Adding a memory for your challenge: “${c.title}”.`;
      if (c.completed_at) happenedOn = dateKey(c.completed_at);
    }
  }
  if (bucketId) {
    const b = await maybeOne<{ title: string; completed_at: Date | null }>(sql`
      select title, completed_at from bucket_items where id = ${bucketId} and user_id = ${user.id}`);
    if (b) {
      title = b.title;
      context = `Adding a memory for your bucket list: “${b.title}”.`;
      if (b.completed_at) happenedOn = dateKey(b.completed_at);
    }
  }
  if (placeId) {
    const p = await maybeOne<{ name: string }>(sql`select name from places where id = ${placeId}`);
    if (p) placeName = p.name;
  }
  return (
    <Page>
      <div className="mx-auto max-w-2xl">
        <Link href="/my-summer" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-3 hover:text-ink">
          <ArrowLeft size={16} aria-hidden="true" /> My Summer
        </Link>
        <h1 className="display text-5xl">Add a memory</h1>
        <p className="mt-2 text-ink-3">A photo, a few words — enough to bring the day back in February.</p>
        <div className="card mt-8 p-6 sm:p-8">
          <MemoryForm defaults={{ title, happenedOn, maxDate: today, placeName, placeId: placeName ? placeId : '', challengeId, bucketId, context }} />
        </div>
      </div>
    </Page>
  );
}
