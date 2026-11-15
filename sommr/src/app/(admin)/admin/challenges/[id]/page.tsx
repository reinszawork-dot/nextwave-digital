import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChallengeForm } from '@/components/admin/ChallengeForm';
import { maybeOne, sql } from '@/server/db';
import { getCategories } from '@/server/services/categories';
import type { Challenge } from '@/server/services/challenges';

export const metadata: Metadata = { title: 'Edit challenge' };

export default async function EditChallengePage({ params, searchParams }: PageProps<'/admin/challenges/[id]'>) {
  const { id } = await params;
  const { saved } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await maybeOne<Challenge & Record<string, unknown>>(sql`select * from challenges where id = ${id}`);
  if (!c) notFound();
  const cats = (await getCategories('place')).filter((x) => x.osm_filters.length);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="display mb-8 text-5xl">Edit challenge</h1>
      {saved === '1' ? <p className="mb-6 rounded-2xl bg-leaf-soft px-4 py-3 text-sm text-[#436b39]">Challenge created.</p> : null}
      <div className="card p-6 sm:p-8">
        <ChallengeForm
          placeCategories={cats.map((x) => ({ slug: x.slug, label: x.label }))}
          initial={{ id: c.id, slug: c.slug, kind: c.kind, title: c.title, description: c.description, tip: c.tip ?? '', interests: c.interests, cost: c.cost, points: String(c.points), place_category: c.place_category ?? '', coastal_only: c.coastal_only, months: c.months, active: c.active, featured: c.featured }}
        />
      </div>
    </div>
  );
}
