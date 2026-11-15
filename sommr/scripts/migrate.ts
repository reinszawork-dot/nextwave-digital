// Apply pending database migrations: `npm run db:migrate` (uses DATABASE_URL).
import { getDb } from '../src/server/db';
import { migrate } from '../src/server/migrate';

const db = await getDb();
await migrate(db);
process.exit(0);
