import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Star } from 'lucide-react';
import { query, sql } from '@/server/db';

export const metadata: Metadata = { title: 'Challenges' };

export default async function AdminChallenges() {
  const rows = await query<{ id: string; title: string; kind: string; cost: string; points: number; active: boolean; featured: boolean; coastal_only: boolean; interests: string[]; done: number }>(sql`
    select c.*, (select count(*) from user_challenges uc where uc.challenge_id = c.id and uc.status = 'completed')::int as done
    from challenges c order by c.kind, c.active desc, c.title`);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl">Challenges</h1>
          <p className="mt-2 text-sm text-ink-3">Each person gets one daily and one weekly challenge, picked to suit their city, the month and their interests.</p>
        </div>
        <Link href="/admin/challenges/new" className="btn btn-primary">
          <Plus size={17} aria-hidden="true" /> Add challenge
        </Link>
      </div>
      {(['daily', 'weekly'] as const).map((kind) => (
        <section key={kind}>
          <h2 className="display mb-3 text-3xl capitalize">{kind}</h2>
          <ul className="card divide-y divide-line">
            {rows
              .filter((r) => r.kind === kind)
              .map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/challenges/${c.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 hover:bg-sand/50">
                    <span className="flex min-w-0 flex-1 items-center gap-1.5 font-medium">
                      {c.featured ? <Star size={14} className="fill-sun text-sun" aria-label="Featured" /> : null}
                      <span className="truncate">{c.title}</span>
                    </span>
                    {c.coastal_only ? <span className="tag tag-sea">coastal</span> : null}
                    <span className="tag">{c.cost}</span>
                    <span className="tag">{c.points} pts</span>
                    <span className="text-xs text-ink-3">{c.done} done</span>
                    {!c.active ? <span className="tag tag-danger">inactive</span> : null}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
