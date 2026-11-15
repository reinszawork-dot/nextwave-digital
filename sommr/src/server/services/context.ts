import 'server-only';
import { DEFAULT_CITY, getCity, type City } from '@/lib/cities';
import { INTERESTS } from '@/lib/interests';
import type { SessionUser } from '../auth';
import type { Assignment } from './challenges';
import { MAX_SWAPS } from './challenges';
import type { Category } from './categories';
import type { ChallengeView } from '@/components/challenges/ChallengeCard';

/** Where to centre recommendations: the user's shared location, or their city. */
export function userLocation(user: SessionUser): { lat: number; lng: number; city: City; precise: boolean } {
  const city = getCity(user.citySlug) ?? DEFAULT_CITY;
  if (user.locationMode === 'device' && user.homeLat != null && user.homeLng != null) {
    return { lat: user.homeLat, lng: user.homeLng, city, precise: true };
  }
  return { lat: city.lat, lng: city.lng, city, precise: false };
}

/** Explore categories that match a user's interests (most relevant first). */
export function interestPlaceCategories(user: SessionUser): string[] {
  const out: string[] = [];
  for (const slug of user.interests) {
    for (const c of INTERESTS.find((i) => i.slug === slug)?.placeCategories ?? []) if (!out.includes(c)) out.push(c);
  }
  return out.length ? out : ['beaches', 'coffee', 'scenic', 'outdoors', 'markets'];
}

export function interestEventCategories(user: SessionUser): string[] {
  const out = new Set<string>();
  for (const slug of user.interests) for (const c of INTERESTS.find((i) => i.slug === slug)?.eventCategories ?? []) out.add(c);
  return [...out];
}

export function toChallengeView(a: Assignment, categories: Map<string, Category>): ChallengeView {
  const placeCat = a.challenge.place_category ? categories.get(a.challenge.place_category) : undefined;
  return {
    id: a.id,
    period: a.period,
    status: a.status,
    swapsLeft: Math.max(0, MAX_SWAPS - a.swapsUsed),
    title: a.challenge.title,
    description: a.challenge.description,
    tip: a.challenge.tip,
    cost: a.challenge.cost,
    points: a.challenge.points,
    placeCategory: placeCat?.active ? placeCat.slug : null,
    placeCategoryLabel: placeCat?.label ?? null,
  };
}

export function categoryLite(c: Category | undefined) {
  return c ? { slug: c.slug, label: c.label, icon: c.icon, color: c.color } : undefined;
}
