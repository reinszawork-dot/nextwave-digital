import type { PhotoKey } from './photos';

export interface Interest {
  slug: string;
  label: string;
  blurb: string;
  photo: PhotoKey;
  /** Explore categories that suit this interest, most relevant first. */
  placeCategories: string[];
  /** What's On categories that suit this interest. */
  eventCategories: string[];
}

export const INTERESTS: Interest[] = [
  {
    slug: 'food',
    label: 'Food & braais',
    blurb: 'Long lunches, smoky braais and new places to eat.',
    photo: 'braai',
    placeCategories: ['braai', 'restaurants', 'coffee'],
    eventCategories: ['food-market'],
  },
  {
    slug: 'beaches',
    label: 'Beaches',
    blurb: 'Salt water, tidal pools and lazy beach days.',
    photo: 'beach-sunset',
    placeCategories: ['beaches', 'scenic'],
    eventCategories: ['outdoor'],
  },
  {
    slug: 'road-trips',
    label: 'Road trips',
    blurb: 'Padstals, passes and the open road.',
    photo: 'blyde-canyon',
    placeCategories: ['scenic', 'outdoors'],
    eventCategories: ['festival'],
  },
  {
    slug: 'music',
    label: 'Music',
    blurb: 'Live sets, DJs and summer anthems.',
    photo: 'concert',
    placeCategories: ['entertainment'],
    eventCategories: ['music', 'djs', 'live'],
  },
  {
    slug: 'festivals',
    label: 'Festivals',
    blurb: 'Big weekends, small-town fêtes and everything between.',
    photo: 'festival',
    placeCategories: ['festivals', 'markets'],
    eventCategories: ['festival', 'party', 'christmas-market'],
  },
  {
    slug: 'outdoors',
    label: 'Outdoor adventures',
    blurb: 'Hikes, waterfalls, camping and sunrise missions.',
    photo: 'camping',
    placeCategories: ['outdoors', 'scenic', 'beaches'],
    eventCategories: ['outdoor', 'sport'],
  },
  {
    slug: 'relaxation',
    label: 'Relaxation',
    blurb: 'Slow mornings, picnics and doing very little, well.',
    photo: 'unwind',
    placeCategories: ['scenic', 'coffee', 'outdoors'],
    eventCategories: ['community', 'live'],
  },
  {
    slug: 'markets',
    label: 'Markets & shopping',
    blurb: 'Night markets, makers and Saturday morning finds.',
    photo: 'market',
    placeCategories: ['markets', 'coffee'],
    eventCategories: ['food-market', 'christmas-market', 'community'],
  },
];

export function getInterest(slug: string): Interest | undefined {
  return INTERESTS.find((i) => i.slug === slug);
}

export const INTEREST_SLUGS = INTERESTS.map((i) => i.slug);
