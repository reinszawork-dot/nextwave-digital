// Promote an existing account to admin: `npm run make-admin -- someone@example.com`
import { query, sql } from '../src/server/db';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run make-admin -- <email>');
  process.exit(1);
}
const rows = await query(sql`update users set role = 'admin', updated_at = now() where lower(email) = ${email} returning id`);
console.log(rows.length ? `${email} is now an admin` : `No account found for ${email}`);
process.exit(rows.length ? 0 : 1);
