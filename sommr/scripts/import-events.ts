// Run every enabled event source now: `npm run import:events`
import { runAllImports } from '../src/server/events/importer';

const result = await runAllImports('cli');
for (const r of result.results) console.log(`${r.status.padEnd(18)} ${r.source} — ${r.message}`);
console.log(`archived ${result.archived} finished events, geocoded ${result.geocoded} venues`);
process.exit(0);
