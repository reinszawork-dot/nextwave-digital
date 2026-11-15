import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from './sql';
import type { Db } from './db';

/** Applies every `migrations/NNN_name.sql` file that hasn't run yet, in order, each in a transaction. */
export async function migrate(db: Db, { log = true }: { log?: boolean } = {}): Promise<string[]> {
  await db.exec(`create table if not exists schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`);
  const dir = join(process.cwd(), 'migrations');
  const files = readdirSync(dir)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort();
  const done = new Set(
    (await db.query<{ name: string }>(sql`select name from schema_migrations`)).map((r) => r.name),
  );
  const applied: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const text = readFileSync(join(dir, file), 'utf8');
    await db.tx(async (t) => {
      await t.exec(text);
      await t.query(sql`insert into schema_migrations (name) values (${file})`);
    });
    applied.push(file);
    if (log) console.log(`applied ${file}`);
  }
  if (log && applied.length === 0) console.log('database is up to date');
  return applied;
}
