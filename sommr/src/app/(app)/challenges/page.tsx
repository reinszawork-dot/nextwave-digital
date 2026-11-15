import type { Metadata } from 'next';
import { Flame, History, Trophy } from 'lucide-react';
import { Page, PageHeader } from '@/components/shell/AppShell';
import { Badge } from '@/components/challenges/Badge';
import { ChallengeCard } from '@/components/challenges/ChallengeCard';
import { Counter } from '@/components/ui/Counter';
import { EmptyState } from '@/components/ui/EmptyState';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { daysLeftInWeek, formatShortDate } from '@/lib/time';
import { requireUser } from '@/server/auth';
import { achievementStats, userAchievements } from '@/server/services/achievements';
import { getCategoryMap } from '@/server/services/categories';
import { challengeHistory, getCurrentChallenge, streaks } from '@/server/services/challenges';
import { toChallengeView } from '@/server/services/context';

export const metadata: Metadata = { title: 'Challenges' };

export default async function ChallengesPage() {
  const user = await requireUser({ next: '/challenges' });
  const now = new Date();
  const [daily, weekly, categories, stats, earned, history, streak] = await Promise.all([
    getCurrentChallenge(user, 'daily', now),
    getCurrentChallenge(user, 'weekly', now),
    getCategoryMap(),
    achievementStats(user.id),
    userAchievements(user.id),
    challengeHistory(user.id, 60),
    streaks(user.id, now),
  ]);
  const earnedCount = ACHIEVEMENTS.filter((a) => earned.has(a.slug)).length;

  return (
    <Page>
      <PageHeader eyebrow="Challenges" title={<>One small adventure <em className="text-sun-deep">a day</em>.</>}>
        A new challenge every morning and a bigger one each week — mostly free, always doable. Swap any that don’t suit you.
      </PageHeader>


      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {daily ? <ChallengeCard c={toChallengeView(daily, categories)} /> : null}
        {weekly ? <ChallengeCard c={toChallengeView(weekly, categories)} variant="compact" daysLeft={daysLeftInWeek(now)} /> : null}
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Points', value: stats.points },
          { label: 'Day streak', value: streak.current, icon: streak.current >= 3 },
          { label: 'Best streak', value: streak.best },
          { label: 'Completed', value: stats.challengesDone },
        ].map((s) => (
          <div key={s.label} className="card px-5 py-4">
            <dt className="eyebrow">{s.label}</dt>
            <dd className="mt-1 flex items-center gap-2">
              <span className="display text-[2.6rem] leading-none">
                <Counter value={s.value} />
              </span>
              {s.icon ? <Flame size={20} className="text-sun" aria-label="On fire" /> : null}
            </dd>
          </div>
        ))}
      </dl>

      <section className="mt-14" aria-labelledby="badges-heading">
        <div className="mb-5 flex items-end justify-between">
          <h2 id="badges-heading" className="display text-[2.1rem]">
            Badges
          </h2>
          <p className="text-sm text-ink-3">
            {earnedCount} of {ACHIEVEMENTS.length} earned
          </p>
        </div>
        <ul className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ACHIEVEMENTS.map((a, i) => (
            <Badge key={a.slug} a={a} earnedAt={earned.get(a.slug)} progress={stats[a.stat]} index={i} />
          ))}
        </ul>
      </section>

      <section className="mt-14" aria-labelledby="history-heading">
        <h2 id="history-heading" className="display mb-5 text-[2.1rem]">
          History
        </h2>
        {history.length === 0 ? (
          <div className="card">
            <EmptyState icon={Trophy} title="Your first one is waiting" compact>
              Complete today’s challenge and it’ll show up here, along with your points.
            </EmptyState>
          </div>
        ) : (
          <ul className="card divide-y divide-line">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-4 px-5 py-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-leaf-soft text-leaf">
                  <History size={17} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{h.title}</p>
                  <p className="text-xs text-ink-3">
                    {h.period === 'weekly' ? 'Weekly' : 'Daily'} · {formatShortDate(h.completed_at)}
                    {h.note ? ` · “${h.note}”` : ''}
                  </p>
                </div>
                <span className="tag tag-sun">+{h.points}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}
