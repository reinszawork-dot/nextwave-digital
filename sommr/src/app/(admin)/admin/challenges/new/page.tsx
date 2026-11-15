import type { Metadata } from 'next';
import { ChallengeForm } from '@/components/admin/ChallengeForm';
import { getCategories } from '@/server/services/categories';

export const metadata: Metadata = { title: 'Add challenge' };

export default async function NewChallengePage() {
  const cats = (await getCategories('place')).filter((c) => c.osm_filters.length);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="display mb-8 text-5xl">Add a challenge</h1>
      <div className="card p-6 sm:p-8">
        <ChallengeForm
          placeCategories={cats.map((c) => ({ slug: c.slug, label: c.label }))}
          initial={{ slug: '', kind: 'daily', title: '', description: '', tip: '', interests: [], cost: 'free', points: '10', place_category: '', coastal_only: false, months: [], active: true, featured: false }}
        />
      </div>
    </div>
  );
}
