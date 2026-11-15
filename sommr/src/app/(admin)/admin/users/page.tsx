import type { Metadata } from 'next';
import { ActionButton } from '@/components/admin/ActionButton';
import { getCity } from '@/lib/cities';
import { formatDateWithYear } from '@/lib/time';
import { setUserRoleAction } from '@/server/actions/admin';
import { requireAdmin } from '@/server/auth';
import { query, sql } from '@/server/db';

export const metadata: Metadata = { title: 'Users' };

export default async function UsersPage({ searchParams }: PageProps<'/admin/users'>) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const like = '%' + q.replace(/[%_\\]/g, '\\$&') + '%';
  const users = await query<{ id: string; email: string; display_name: string; role: string; city_slug: string | null; created_at: Date; points: number }>(sql`
    select u.id, u.email, u.display_name, u.role, u.city_slug, u.created_at,
      (select coalesce(sum(amount), 0) from points_ledger p where p.user_id = u.id)::int as points
    from users u ${q ? sql`where u.email ilike ${like} or u.display_name ilike ${like}` : sql.empty}
    order by u.created_at desc limit 200`);
  return (
    <div className="space-y-6">
      <h1 className="display text-5xl">Users</h1>
      <form role="search">
        <input name="q" defaultValue={q} placeholder="Search name or email" className="input !h-10 max-w-sm !rounded-full" aria-label="Search users" />
      </form>
      <ul className="card divide-y divide-line">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{u.display_name}</span>
              <span className="block truncate text-xs text-ink-3">
                {u.email} · {getCity(u.city_slug)?.name ?? 'No city yet'} · joined {formatDateWithYear(u.created_at)}
              </span>
            </span>
            <span className="text-xs text-ink-3">{u.points} pts</span>
            {u.role === 'admin' ? <span className="tag tag-sea">admin</span> : null}
            {u.id !== me.id ? (
              <ActionButton
                action={setUserRoleAction.bind(null, u.id, u.role === 'admin' ? 'user' : 'admin')}
                confirm={u.role === 'admin' ? `Remove admin access from ${u.email}?` : `Give ${u.email} full admin access?`}
                success="Role updated"
              >
                {u.role === 'admin' ? 'Remove admin' : 'Make admin'}
              </ActionButton>
            ) : (
              <span className="text-xs text-ink-3">You</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
