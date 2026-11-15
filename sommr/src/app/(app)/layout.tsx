import { AppShell } from '@/components/shell/AppShell';
import { getCurrentUser } from '@/server/auth';

/**
 * Signed-in pages get the app shell. Visitors (only `/` is public here) see the
 * page bare; every other page in this group redirects them to sign in.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !user.onboarded) return <>{children}</>;
  return <AppShell user={user}>{children}</AppShell>;
}
