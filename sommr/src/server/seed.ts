import { sql } from './sql';
import type { Db, Queryable } from './db';
import { CATEGORY_SEED, CHALLENGE_SEED, EVENT_SOURCE_SEED } from './seed-data';

/** Inserts default categories, challenges and event sources. Existing rows are never overwritten. */
export async function seed(db: Queryable): Promise<{ categories: number; challenges: number; sources: number }> {
  let categories = 0;
  let challenges = 0;
  let sources = 0;
  for (const [i, c] of CATEGORY_SEED.entries()) {
    const rows = await db.query(sql`
      insert into categories (slug, kind, label, description, icon, color, osm_filters, event_categories, keywords, sort)
      values (${c.slug}, ${c.kind}, ${c.label}, ${c.description}, ${c.icon}, ${c.color},
              ${c.osm_filters ?? []}, ${c.event_categories ?? []}, ${c.keywords ?? []}, ${i})
      on conflict (slug) do nothing
      returning slug`);
    categories += rows.length;
  }
  for (const c of CHALLENGE_SEED) {
    const rows = await db.query(sql`
      insert into challenges (slug, kind, title, description, tip, interests, cost, points, place_category, coastal_only, months)
      values (${c.slug}, ${c.kind}, ${c.title}, ${c.description}, ${c.tip ?? null}, ${c.interests ?? []},
              ${c.cost}, ${c.points}, ${c.place_category ?? null}, ${c.coastal_only ?? false}, ${c.months ?? []})
      on conflict (slug) do nothing
      returning slug`);
    challenges += rows.length;
  }
  for (const s of EVENT_SOURCE_SEED) {
    const exists = await db.query(sql`
      select 1 from event_sources
      where kind = ${s.kind} and coalesce(city_slug, '') = ${s.city_slug ?? ''}`);
    if (exists.length) continue;
    await db.query(sql`
      insert into event_sources (kind, name, city_slug, config)
      values (${s.kind}, ${s.name}, ${s.city_slug}, ${JSON.stringify(s.config)}::jsonb)`);
    sources++;
  }
  return { categories, challenges, sources };
}

export async function seedIfEmpty(db: Db): Promise<void> {
  const [{ n }] = await db.query<{ n: number }>(sql`select count(*)::int as n from categories`);
  if (n === 0) await seed(db);
}
