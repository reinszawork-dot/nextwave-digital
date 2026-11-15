import type { Metadata } from 'next';
import { EventForm } from '@/components/admin/EventForm';
import { getCategories } from '@/server/services/categories';

export const metadata: Metadata = { title: 'Add event' };

export default async function NewEventPage() {
  const categories = await getCategories('event');
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="display mb-2 text-5xl">Add an event</h1>
      <p className="mb-8 text-ink-3">Only add events you’ve verified with the organiser or an official listing.</p>
      <div className="card p-6 sm:p-8">
        <EventForm
          categories={categories.map((c) => ({ slug: c.slug, label: c.label }))}
          initial={{ title: '', description: '', category_slug: '', starts_at: '', ends_at: '', all_day: false, venue_name: '', address: '', city_slug: '', lat: '', lng: '', price_min: '', price_max: '', is_free: false, ticket_url: '', image_url: '', organiser: '', status: 'published', featured: false, featured_note: '' }}
        />
      </div>
    </div>
  );
}
