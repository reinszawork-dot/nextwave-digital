// Runs before `next build`. On Vercel production deploys (or with RUN_MIGRATIONS=true) it
// applies database migrations and seeds default data, so each deployment sets up its own
// tables — no command line needed. Safe to repeat: migrations and seeds are idempotent.
import { getDb } from '../src/server/db';
import { env } from '../src/server/env';
import { migrate } from '../src/server/migrate';
import { seed } from '../src/server/seed';

const production = process.env.VERCEL_ENV === 'production' || process.env.RUN_MIGRATIONS === 'true';
if (!production) {
  console.log('predeploy: not a production deploy — skipping database setup');
  process.exit(0);
}
if (!env.DATABASE_URL) {
  console.error(
    '\npredeploy: no database configured.\n' +
      'In Vercel open Storage → Connect Database (Neon or Supabase), or set DATABASE_URL, then redeploy.\n',
  );
  process.exit(1);
}
const db = await getDb();
await migrate(db);
const seeded = await seed(db);
console.log(`predeploy: database ready (seeded ${seeded.categories} categories, ${seeded.challenges} challenges, ${seeded.sources} sources)`);
process.exit(0);
