import 'server-only';
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { maybeOne, query, sql } from './db';
import { env } from './env';

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

export const SESSION_COOKIE = 'sommr_session';
const SESSION_DAYS = 60;
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 96 * 1024 * 1024 };

// ───────────────────────────── Passwords ─────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize('NFKC'), salt, 64, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, N, r, p, saltB64, hashB64] = stored.split('$');
  if (algo !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT.maxmem,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** A precomputed hash so failed logins for unknown emails take as long as real ones. */
let dummyHash: Promise<string> | null = null;
export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(12).toString('hex'));
  return dummyHash;
}

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

// ───────────────────────────── Sessions ─────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  citySlug: string | null;
  homeLat: number | null;
  homeLng: number | null;
  locationMode: 'city' | 'device';
  interests: string[];
  onboarded: boolean;
  createdAt: Date;
}

interface UserRow extends Record<string, unknown> {
  id: string;
  email: string;
  display_name: string;
  role: 'user' | 'admin';
  city_slug: string | null;
  home_lat: number | null;
  home_lng: number | null;
  location_mode: 'city' | 'device';
  interests: string[];
  onboarded_at: Date | null;
  created_at: Date;
}

export function toSessionUser(r: UserRow): SessionUser {
  return {
    id: r.id,
    email: r.email,
    displayName: r.display_name,
    role: r.role,
    citySlug: r.city_slug,
    homeLat: r.home_lat,
    homeLng: r.home_lng,
    locationMode: r.location_mode,
    interests: r.interests ?? [],
    onboarded: !!r.onboarded_at,
    createdAt: r.created_at,
  };
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const ua = (await headers()).get('user-agent')?.slice(0, 300) ?? null;
  await query(sql`
    insert into sessions (user_id, token_hash, user_agent, expires_at)
    values (${userId}, ${sha256(token)}, ${ua}, ${expires})`);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    expires,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await query(sql`delete from sessions where token_hash = ${sha256(token)}`);
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user for this request, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const row = await maybeOne<UserRow & { session_id: string; last_seen_at: Date }>(sql`
    select u.*, s.id as session_id, s.last_seen_at
    from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${sha256(token)} and s.expires_at > now()`);
  if (!row) return null;
  if (Date.now() - new Date(row.last_seen_at).getTime() > 3_600_000) {
    await query(sql`update sessions set last_seen_at = now() where id = ${row.session_id}`);
  }
  return toSessionUser(row);
});

/** Require a signed-in, onboarded user; otherwise redirect. */
export async function requireUser(opts: { allowUnonboarded?: boolean; next?: string } = {}): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(opts.next ? `/login?next=${encodeURIComponent(opts.next)}` : '/login');
  if (!user.onboarded && !opts.allowUnonboarded) redirect('/onboarding');
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser({ allowUnonboarded: true, next: '/admin' });
  if (user.role !== 'admin') redirect('/');
  return user;
}

// ───────────────────────────── Rate limiting ─────────────────────────────

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'local').trim().slice(0, 64);
}

/**
 * Sliding-window limiter backed by the database (works across serverless instances).
 * Returns false when the bucket has reached `limit` attempts in the window.
 */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
  const since = new Date(Date.now() - windowSeconds * 1000);
  const row = await maybeOne<{ n: number }>(sql`
    select count(*)::int as n from auth_attempts where bucket = ${bucket} and created_at > ${since}`);
  if ((row?.n ?? 0) >= limit) return false;
  await query(sql`insert into auth_attempts (bucket) values (${bucket})`);
  if (Math.random() < 0.02) {
    await query(sql`delete from auth_attempts where created_at < now() - interval '1 day'`);
  }
  return true;
}
