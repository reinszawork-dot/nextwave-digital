import { redirect } from 'next/navigation';
import { Dashboard } from '@/components/home/Dashboard';
import { Welcome } from '@/components/home/Welcome';
import { getCurrentUser } from '@/server/auth';

export default async function HomePage({ searchParams }: PageProps<'/'>) {
  const user = await getCurrentUser();
  if (!user) return <Welcome />;
  if (!user.onboarded) redirect('/onboarding');
  const { welcome } = await searchParams;
  return <Dashboard user={user} welcome={welcome === '1'} />;
}
