import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Page, PageHeader } from '@/components/shell/AppShell';
import { SummerTabs } from '@/components/summer/SummerTabs';
import { KeyedTransition } from '@/components/motion/KeyedTransition';
import { Counter } from '@/components/ui/Counter';
import { getCurrentUser } from '@/server/auth';
import { summerStats } from '@/server/services/memories';

export default async function MySummerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) return <>{children}</>; // pages redirect to sign in
  const stats = await summerStats(user.id);
  return (
    <Page>
      <PageHeader
        eyebrow="My Summer"
        title={
          <>
            Your summer, <em className="text-sun-deep">so far</em>.
          </>
        }
        actions={
          <Link href="/my-summer/new" className="btn btn-primary">
            <Plus size={18} aria-hidden="true" /> Add a memory
          </Link>
        }
      />
      <dl className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Memories', value: stats.memories },
          { label: 'Photos', value: stats.photos },
          { label: 'Places visited', value: stats.places },
          { label: 'Challenges', value: stats.challenges },
        ].map((s) => (
          <div key={s.label} className="well px-4 py-3 sm:px-5 sm:py-4">
            <dt className="eyebrow">{s.label}</dt>
            <dd className="display mt-1 text-[1.9rem] leading-none sm:text-[2.4rem]">
              <Counter value={s.value} />
            </dd>
          </div>
        ))}
      </dl>
      <div className="mb-8">
        <SummerTabs />
      </div>
      <KeyedTransition kind="tab">{children}</KeyedTransition>
    </Page>
  );
}
