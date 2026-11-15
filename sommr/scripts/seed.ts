// Insert default categories, challenges and event sources: `npm run db:seed`.
// Safe to re-run: existing rows (including admin edits) are left untouched.
import { getDb } from '../src/server/db';
import { seed } from '../src/server/seed';

const db = await getDb();
const result = await seed(db);
console.log(`seeded ${result.categories} categories, ${result.challenges} challenges, ${result.sources} event sources`);
process.exit(0);
