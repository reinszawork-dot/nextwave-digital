import type { Metadata } from 'next';
import { CategoryForm } from '@/components/admin/CategoryForm';
import { CategoryIcon } from '@/components/ui/Icon';
import { getCategories } from '@/server/services/categories';

export const metadata: Metadata = { title: 'Categories' };

export default async function CategoriesPage() {
  const all = await getCategories(undefined, true);
  return (
    <div className="space-y-10">
      <div>
        <h1 className="display text-5xl">Categories</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-3">
          Place categories control what Explore imports from OpenStreetMap (by tag). Event categories sort imported events using their keywords.
        </p>
      </div>
      {(['place', 'event'] as const).map((kind) => (
        <section key={kind}>
          <h2 className="display mb-4 text-3xl">{kind === 'place' ? 'Explore (places)' : 'What’s On (events)'}</h2>
          <div className="space-y-3">
            {all
              .filter((c) => c.kind === kind)
              .map((c) => (
                <details key={c.slug} className="card group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4">
                    <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${c.color} 15%, white)`, color: c.color }}>
                      <CategoryIcon name={c.icon} size={17} />
                    </span>
                    <span className="flex-1 font-medium">{c.label}</span>
                    <span className="hidden text-xs text-ink-3 sm:inline">{kind === 'place' ? c.osm_filters.join(', ') || `events: ${c.event_categories.join(', ')}` : `${c.keywords.length} keywords`}</span>
                    {!c.active ? <span className="tag tag-danger">inactive</span> : null}
                    <span className="text-sm text-sea-deep group-open:hidden">Edit</span>
                  </summary>
                  <div className="border-t border-line px-5 py-5">
                    <CategoryForm initial={{ slug: c.slug, kind: c.kind, label: c.label, description: c.description ?? '', icon: c.icon, color: c.color, osm_filters: c.osm_filters, event_categories: c.event_categories, keywords: c.keywords, sort: c.sort, active: c.active }} />
                  </div>
                </details>
              ))}
          </div>
        </section>
      ))}
      <section>
        <h2 className="display mb-4 text-3xl">Add a category</h2>
        <div className="card p-6">
          <CategoryForm isNew initial={{ slug: '', kind: 'place', label: '', description: '', icon: 'map-pin', color: '#4f86b8', osm_filters: [], event_categories: [], keywords: [], sort: 50, active: true }} />
        </div>
      </section>
    </div>
  );
}
