import 'server-only';
import { cache } from 'react';
import { query, sql } from '../db';

export interface Category {
  slug: string;
  kind: 'place' | 'event';
  label: string;
  description: string | null;
  icon: string;
  color: string;
  osm_filters: string[];
  event_categories: string[];
  keywords: string[];
  sort: number;
  active: boolean;
}

export const getCategories = cache(async (kind?: 'place' | 'event', includeInactive = false): Promise<Category[]> => {
  return query<Category & Record<string, unknown>>(sql`
    select * from categories
    where ${kind ? sql`kind = ${kind}` : sql`true`} and ${includeInactive ? sql`true` : sql`active`}
    order by kind, sort, label`);
});

export async function getCategoryMap(): Promise<Map<string, Category>> {
  const all = await getCategories(undefined, true);
  return new Map(all.map((c) => [c.slug, c]));
}
