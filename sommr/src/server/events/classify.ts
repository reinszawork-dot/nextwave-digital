/**
 * Map an imported event to one SOMMR event category, using provider hints first,
 * then the editable keyword lists on each category.
 */
export interface ClassifierCategory {
  slug: string;
  keywords: string[];
}

// Strong, provider-level signals (Ticketmaster segments/genres, Quicket categories, schema.org types).
const HINT_RULES: [RegExp, string][] = [
  [/christmas|xmas|festive/i, 'christmas-market'],
  [/festival/i, 'festival'],
  [/dance\/electronic|electronic|nightlife|club|dj/i, 'djs'],
  [/comedy|theatre|theater|arts & theatre|musical|ballet|opera|dance(?!\/)|cabaret|magic|spoken/i, 'live'],
  [/sport|cricket|rugby|soccer|football|athletic|motorsport|golf|tennis|running|cycling/i, 'sport'],
  [/food|drink|wine|market|culinary|tasting/i, 'food-market'],
  [/party|parties/i, 'party'],
  [/outdoor|adventure|nature|hiking/i, 'outdoor'],
  [/family|kids|community|charity|education|workshop|faith|church|networking/i, 'community'],
  [/music|concert|jazz|rock|pop|hip-hop|rap|r&b|classical|country|gospel|amapiano/i, 'music'],
];

// When only free text is available, check categories in this order.
const PRIORITY = ['christmas-market', 'festival', 'djs', 'live', 'sport', 'food-market', 'party', 'outdoor', 'community', 'music'];

function hasWord(text: string, keyword: string): boolean {
  const k = keyword.toLowerCase().trim();
  if (!k) return false;
  const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i').test(text);
}

export function classifyEvent(
  input: { title: string; description?: string | null; hints: string[] },
  categories: ClassifierCategory[],
  fallback = 'other',
): string {
  const known = new Set(categories.map((c) => c.slug));
  const title = input.title.toLowerCase();
  const desc = (input.description ?? '').toLowerCase().slice(0, 1500);

  // Christmas markets need both a festive word and a market-ish word.
  const festive = /christmas|xmas|festive|carols/i;
  const marketish = /market|fair|bazaar|craft|stalls/i;
  if (known.has('christmas-market') && festive.test(title) && (marketish.test(title) || marketish.test(desc))) {
    return 'christmas-market';
  }

  const byKeywords = (text: string) => {
    for (const slug of [...PRIORITY, ...categories.map((c) => c.slug)]) {
      if (slug === 'christmas-market') continue;
      const cat = categories.find((c) => c.slug === slug);
      if (cat && cat.keywords.some((k) => hasWord(text, k))) return slug;
    }
    return null;
  };

  // The title is the strongest signal of what an event really is.
  const fromTitle = byKeywords(title);
  if (fromTitle && fromTitle !== 'music') return fromTitle;

  for (const hint of input.hints) {
    for (const [re, slug] of HINT_RULES) {
      if (slug === 'christmas-market') continue;
      if (re.test(hint) && known.has(slug)) return slug;
    }
  }
  if (fromTitle) return fromTitle;
  return byKeywords(desc) ?? (known.has(fallback) ? fallback : categories[0]?.slug ?? 'other');
}
