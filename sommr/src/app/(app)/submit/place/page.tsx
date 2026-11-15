import type { Metadata } from 'next';
import { Page } from '@/components/shell/AppShell';
import { SubmitPlaceForm } from '@/components/submit/SubmitForms';
import { requireUser } from '@/server/auth';
import { getCategories } from '@/server/services/categories';

export const metadata: Metadata = { title: 'Suggest a place' };

export default async function SubmitPlacePage() {
  await requireUser({ next: '/submit/place' });
  const categories = (await getCategories('place')).filter((c) => c.osm_filters.length);
  return (
    <Page>
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Explore</p>
        <h1 className="display mt-2 text-5xl">Suggest a place</h1>
        <p className="mt-3 text-ink-3">A hidden beach, the best padstal on the N2, a braai spot with a view — tell us and we’ll add it once it’s checked.</p>
        <div className="card mt-8 p-6 sm:p-8">
          <SubmitPlaceForm categories={categories.map((c) => ({ slug: c.slug, label: c.label }))} />
        </div>
      </div>
    </Page>
  );
}
