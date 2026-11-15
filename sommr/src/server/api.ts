import 'server-only';
import { NextResponse } from 'next/server';
import { getCurrentUser, rateLimit, type SessionUser } from './auth';
import type { PlaceRow } from './places/service';

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { 'Cache-Control': 'private, no-store', ...(init?.headers ?? {}) } });
}

export function apiError(status: number, message: string) {
  return json({ error: message }, { status });
}

/** The signed-in user, or a 401 response to return. */
export async function apiUser(): Promise<SessionUser | Response> {
  const user = await getCurrentUser();
  return user ?? apiError(401, 'Please sign in.');
}

/** Per-user request budget for endpoints that call third-party services. */
export async function apiRateLimit(user: SessionUser, name: string, limit: number, windowSeconds: number) {
  return rateLimit(`api:${name}:${user.id}`, limit, windowSeconds);
}

export function num(v: string | null): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Compact place shape for maps and lists. */
export function placeDto(p: PlaceRow) {
  return {
    id: p.id,
    name: p.name,
    category: p.category_slug,
    lat: p.lat,
    lng: p.lng,
    suburb: p.suburb ?? p.city,
    featured: p.featured,
    featuredNote: p.featured_note,
    saved: !!p.saved_at,
    visited: !!p.visited_at,
    saves: p.saves,
    distanceKm: p.distance_km ?? null,
  };
}
export type PlaceDto = ReturnType<typeof placeDto>;
