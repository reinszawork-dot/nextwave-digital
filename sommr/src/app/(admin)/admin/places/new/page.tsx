import type { Metadata } from 'next';
import { PlaceForm } from '@/components/admin/PlaceForm';
import { getCategories } from '@/server/services/categories';

export const metadata: Metadata = { title: 'Add place' };

export default async function NewPlacePage() {
  const categories = (await getCategories('place')).filter((c) => c.event_categories.length === 0);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="display mb-2 text-5xl">Add a place</h1>
      <p className="mb-8 text-ink-3">For real places that are missing from the map. If it’s a permanent public place, adding it to OpenStreetMap helps everyone too.</p>
      <div className="card p-6 sm:p-8">
        <PlaceForm
          categories={categories.map((c) => ({ slug: c.slug, label: c.label }))}
          initial={{ name: '', category_slug: '', lat: '', lng: '', address: '', suburb: '', city: '', description: '', website: '', phone: '', opening_hours: '', status: 'published', featured: false, featured_note: '' }}
        />
      </div>
    </div>
  );
}
