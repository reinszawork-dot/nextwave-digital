import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { PlaceForm } from '@/components/admin/PlaceForm';
import { maybeOne, sql } from '@/server/db';
import { osmUrl } from '@/server/places/service';
import { getCategories } from '@/server/services/categories';

export const metadata: Metadata = { title: 'Edit place' };

export default async function EditPlacePage({ params, searchParams }: PageProps<'/admin/places/[id]'>) {
  const { id } = await params;
  const { saved } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const p = await maybeOne<Record<string, unknown> & { id: string; source: string; source_id: string | null; submitted_by_email: string | null }>(sql`
    select p.*, u.email as submitted_by_email from places p left join users u on u.id = p.submitted_by where p.id = ${id}`);
  if (!p) notFound();
  const categories = (await getCategories('place', true)).filter((c) => c.event_categories.length === 0);
  const s = (k: string) => (p[k] == null ? '' : String(p[k]));
  const osm = osmUrl(p.source_id);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="display text-5xl">Edit place</h1>
        <Link href={`/places/${p.id}`} className="btn btn-ghost btn-sm">
          <ExternalLink size={15} aria-hidden="true" /> View
        </Link>
      </div>
      <p className="mb-8 text-sm text-ink-3">
        Source: <strong>{p.source === 'osm' ? 'OpenStreetMap' : p.source}</strong>
        {p.submitted_by_email ? ` · suggested by ${p.submitted_by_email}` : ''}
        {osm ? (
          <>
            {' · '}
            <a className="link" href={osm} target="_blank" rel="noreferrer">
              view on OpenStreetMap
            </a>
          </>
        ) : null}
      </p>
      {saved === '1' ? <p className="mb-6 rounded-2xl bg-leaf-soft px-4 py-3 text-sm text-[#436b39]">Place created.</p> : null}
      <div className="card p-6 sm:p-8">
        <PlaceForm
          categories={categories.map((c) => ({ slug: c.slug, label: c.label }))}
          initial={{
            id: p.id,
            source: p.source,
            name: s('name'),
            category_slug: s('category_slug'),
            lat: s('lat'),
            lng: s('lng'),
            address: s('address'),
            suburb: s('suburb'),
            city: s('city'),
            description: s('description'),
            website: s('website'),
            phone: s('phone'),
            opening_hours: s('opening_hours'),
            status: s('status'),
            featured: !!p.featured,
            featured_note: s('featured_note'),
          }}
        />
      </div>
    </div>
  );
}
