import 'server-only';
import { SqlFragment, type Row } from './sql';
import { env } from './env';

/**
 * Database access. Production uses PostgreSQL through `pg` (DATABASE_URL — Supabase,
 * Neon or any Postgres). Local development without DATABASE_URL falls back to an
 * embedded PGlite database in `.data/pglite`, so `npm run dev` works with zero setup.
 */
export interface Queryable {
  query<T extends Row = Row>(q: SqlFragment): Promise<T[]>;
  /** Run raw, trusted SQL that may contain several statements (migrations only). */
  exec(text: string): Promise<void>;
}

export interface Db extends Queryable {
  tx<T>(fn: (t: Queryable) => Promise<T>): Promise<T>;
  driver: 'pg' | 'pglite';
}

// Consistent types across both drivers: counts as numbers, money as numbers,
// calendar dates as 'YYYY-MM-DD' strings (never shifted by the server's timezone).
const INT8 = 20;
const NUMERIC = 1700;
const DATE = 1082;

async function createPg(url: string): Promise<Db> {
  const pg = await import('pg');
  const { Pool, types } = pg.default ?? pg;
  types.setTypeParser(INT8, (v: string) => Number(v));
  types.setTypeParser(NUMERIC, (v: string) => parseFloat(v));
  types.setTypeParser(DATE, (v: string) => v);
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || url.includes('host=/');
  // DATABASE_SSL: "disable" (local only), "require" (encrypted — the default for remote
  // databases; Supabase's pooler uses its own CA) or "verify" (encrypted + certificate
  // checked against system CAs, or DATABASE_CA_CERT if set).
  const mode = process.env.DATABASE_SSL || (isLocal ? 'disable' : 'require');
  const ssl =
    mode === 'disable'
      ? undefined
      : mode === 'verify'
        ? { rejectUnauthorized: true, ca: process.env.DATABASE_CA_CERT || undefined }
        : { rejectUnauthorized: false };
  const pool = new Pool({
    connectionString: url.replace(/([?&])sslmode=[^&]*&?/, '$1').replace(/[?&]$/, ''),
    max: Number(process.env.DATABASE_POOL_MAX || 5),
    ssl,
    idleTimeoutMillis: 10_000,
  });
  pool.on('error', (err) => console.error('[db] idle client error', err.message));
  const run = async <T extends Row>(client: { query: typeof pool.query }, q: SqlFragment) => {
    const { text, values } = q.compile();
    const res = await client.query(text, values as unknown[]);
    return res.rows as T[];
  };
  return {
    driver: 'pg',
    query: (q) => run(pool, q),
    exec: async (text) => {
      await pool.query(text);
    },
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const result = await fn({
          query: (q) => run(client as never, q),
          exec: async (text) => {
            await client.query(text);
          },
        });
        await client.query('commit');
        return result;
      } catch (err) {
        await client.query('rollback').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
  };
}

async function createPglite(): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite');
  const { mkdirSync } = await import('node:fs');
  const dir = process.env.PGLITE_DIR || '.data/pglite';
  mkdirSync(dir, { recursive: true });
  const lite = new PGlite({
    dataDir: dir,
    parsers: {
      [INT8]: (v: string) => Number(v),
      [NUMERIC]: (v: string) => parseFloat(v),
      [DATE]: (v: string) => v,
    },
  });
  await lite.waitReady;
  const run = async <T extends Row>(
    client: { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }> },
    q: SqlFragment,
  ) => {
    const { text, values } = q.compile();
    const res = await client.query(text, values);
    return res.rows as T[];
  };
  const db: Db = {
    driver: 'pglite',
    query: (q) => run(lite as never, q),
    exec: async (text) => {
      await lite.exec(text);
    },
    tx: (fn) =>
      lite.transaction((t) =>
        fn({
          query: (q) => run(t as never, q),
          exec: async (text) => {
            await t.exec(text);
          },
        }),
      ),
  };
  // Zero-config local development: apply migrations and seed data automatically.
  const { migrate } = await import('./migrate');
  await migrate(db, { log: false });
  const { seedIfEmpty } = await import('./seed');
  await seedIfEmpty(db);
  return db;
}

const globalForDb = globalThis as unknown as { __sommrDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalForDb.__sommrDb) {
    if (env.DATABASE_URL) {
      globalForDb.__sommrDb = createPg(env.DATABASE_URL);
    } else if (process.env.NODE_ENV === 'production' && !process.env.SOMMR_ALLOW_PGLITE) {
      throw new Error(
        'DATABASE_URL is not set. Production needs a PostgreSQL database (e.g. Supabase). See README.',
      );
    } else {
      globalForDb.__sommrDb = createPglite();
    }
    globalForDb.__sommrDb.catch(() => {
      globalForDb.__sommrDb = undefined;
    });
  }
  return globalForDb.__sommrDb;
}

/** Run a query and return all rows. */
export async function query<T extends Row = Row>(q: SqlFragment): Promise<T[]> {
  return (await getDb()).query<T>(q);
}

/** Run a query and return the first row, or null. */
export async function maybeOne<T extends Row = Row>(q: SqlFragment): Promise<T | null> {
  const rows = await query<T>(q);
  return rows[0] ?? null;
}

/** Run a query that must return a row. */
export async function one<T extends Row = Row>(q: SqlFragment): Promise<T> {
  const row = await maybeOne<T>(q);
  if (!row) throw new Error('Expected a row but the query returned none');
  return row;
}

export async function transaction<T>(fn: (t: Queryable) => Promise<T>): Promise<T> {
  return (await getDb()).tx(fn);
}

export { sql } from './sql';
