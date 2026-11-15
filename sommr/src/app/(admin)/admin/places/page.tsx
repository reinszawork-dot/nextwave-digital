import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Star } from 'lucide-react';
import { query, sql } from '@/server/db';
import { getCategories } from '@/server/services/categories';

export const metadata: Metadata = { title: 'Places' };

export default async function AdminPlaces({ searchParams }: PageProps<'/admin/places'>) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const status = typeof sp.status === 'string' ? sp.status : '';
  const cat = typeof sp.category === 'string' ? sp.category : '';
  const source = typeof sp.source === 'string' ? sp.source : '';
  const like = '%' + q.replace(/[%_\\]/g, '\\$&') + '%';
  const [rows, categories, totals] = await Promise.all([
    query<{ id: string; name: string; category_slug: string; suburb: string | null; city: string | null; status: string; source: string; featured: boolean; saves: number }>(sql`
      select p.id, p.name, p.category_slug, p.suburb, p.city, p.status, p.source, p.featured,
        (select count(*) from place_marks m where m.place_id = p.id and m.saved_at is not null)::int as saves
      from places p
      where ${sql.and([
        q ? sql`(p.name ilike ${like} or p.suburb ilike ${like} or p.city ilike ${like})` : null,
        status ? sql`p.status = ${status}` : null,
        cat ? sql`p.category_slug = ${cat}` : null,
        source ? sql`p.source = ${source}` : null,
      ])}
      order by p.featured desc, saves desc, p.updated_at desc limit 150`),
    getCategories('place', true),
    query<{ source: string; n: number }>(sql`select source, count(*)::int as n from places group by source`),
  ]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl">Places</h1>
          <p className="mt-2 text-sm text-ink-3">{totals.map((t) => `${t.n} from ${t.source === 'osm' ? 'OpenStreetMap' : t.source}`).join(' · ') || 'No places yet — they load from OpenStreetMap as people explore.'}</p>
        </div>
        <Link href="/admin/places/new" className="btn btn-primary">
          <Plus size={17} aria-hidden="true" /> Add place
        </Link>
      </div>
      <form className="flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Search name or area" className="input !h-10 max-w-xs !rounded-full" aria-label="Search places" />
        <select name="category" defaultValue={cat} className="select !h-10 !w-auto !rounded-full" aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} className="select !h-10 !w-auto !rounded-full" aria-label="Status">
          <option value="">Any status</option>
          {['published', 'pending', 'hidden', 'rejected'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select name="source" defaultValue={source} className="select !h-10 !w-auto !rounded-full" aria-label="Source">
          <option value="">Any source</option>
          <option value="osm">OpenStreetMap</option>
          <option value="admin">Admin</option>
          <option value="community">Community</option>
        </select>
        <button className="btn btn-ghost btn-sm !h-10">Filter</button>
      </form>
      {rows.length === 0 ? (
        <p className="card px-5 py-10 text-center text-ink-3">No places match.</p>
      ) : (
        <ul className="card divide-y divide-line">
          {rows.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/places/${p.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-sand/50">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    {p.featured ? <Star size={14} className="fill-sun text-sun" aria-label="Featured" /> : null}
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="block truncate text-xs text-ink-3">{[categories.find((c) => c.slug === p.category_slug)?.label, p.suburb, p.city].filter(Boolean).join(' · ')}</span>
                </span>
                {p.saves ? <span className="tag">{p.saves} saves</span> : null}
                <span className="tag">{p.source}</span>
                <span className={`tag ${p.status === 'published' ? 'tag-leaf' : p.status === 'pending' ? 'tag-sun' : 'tag-danger'}`}>{p.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
