import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowUpRight, CalendarDays, Compass, Flame, Sun, Sunset, Trophy } from 'lucide-react';
import { Page, SectionHeader } from '@/components/shell/AppShell';
import { Float } from '@/components/motion/Float';
import { WordReveal } from '@/components/motion/WordReveal';
import { ChallengeCard } from '@/components/challenges/ChallengeCard';
import { Counter } from '@/components/ui/Counter';
import { Photo } from '@/components/ui/Photo';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { cityPhoto } from '@/lib/photos';
import { nextMilestone, seasonState } from '@/lib/season';
import { sunTimes } from '@/lib/sun';
import { dateKey, daysLeftInWeek, formatLongDate, formatTime, greeting } from '@/lib/time';
import type { SessionUser } from '@/server/auth';
import { bucketProgress, listBucket } from '@/server/services/bucket';
import { getCategoryMap } from '@/server/services/categories';
import { getCurrentChallenge, streaks, totalPoints } from '@/server/services/challenges';
import { categoryLite, interestPlaceCategories, toChallengeView, userLocation } from '@/server/services/context';
import { describeWeather, getWeather, weatherNudge } from '@/server/services/weather';
import { EventsSection, EventsSkeleton } from './EventsSection';
import { NearbySection } from './NearbySection';
import { Recommendations } from './Recommendations';
import { BucketPreview } from './BucketPreview';

export async function Dashboard({ user, welcome }: { user: SessionUser; welcome: boolean }) {
  const loc = userLocation(user);
  const now = new Date();
  const [daily, weekly, categories, weather, points, streak, progress, bucket] = await Promise.all([
    getCurrentChallenge(user, 'daily', now),
    getCurrentChallenge(user, 'weekly', now),
    getCategoryMap(),
    getWeather(loc.lat, loc.lng),
    totalPoints(user.id),
    streaks(user.id, now),
    bucketProgress(user.id),
    listBucket(user.id),
  ]);
  const season = seasonState(now);
  const milestone = nextMilestone(now);
  const sun = sunTimes(dateKey(now), loc.lat, loc.lng);
  const sunsetPassed = now > sun.sunset;
  const firstName = user.displayName.split(' ')[0];
  const w = weather ? describeWeather(weather.code) : null;
  const nudge = weather ? weatherNudge(weather) : null;

  return (
    <Page>
      {/* ── Greeting & countdown ── */}
      <section className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-stretch">
        <div className="flex flex-col justify-center py-2">
          <p className="eyebrow fade-in">{formatLongDate(now)}</p>
          <h1 className="display mt-3 text-[3rem] sm:text-6xl lg:text-[4.4rem]">
            <WordReveal delay={80}>
              {welcome ? 'Welcome' : greeting(now)}, <em className="text-sun-deep">{firstName}</em>.
            </WordReveal>
          </h1>
          <div className="stagger mt-5 space-y-2 text-[1.05rem] text-ink-2" style={{ ['--stagger' as string]: '90ms' }}>
            {weather && w ? (
              <p className="flex flex-wrap items-center gap-x-2" style={{ ['--i' as string]: 4 }}>
                <Sun size={18} className="spin-slow text-sun" aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-ink">{weather.temperature}°</strong> and {w.label} in{' '}
                  {loc.precise ? 'your area' : loc.city.name}
                  {weather.max > weather.temperature ? <span className="text-ink-3"> · high of {weather.max}°</span> : null}
                </span>
              </p>
            ) : null}
            <p className="flex items-center gap-2" style={{ ['--i' as string]: 5 }}>
              <Sunset size={18} className="text-sun-deep" aria-hidden="true" />
              {sunsetPassed ? (
                <span>Tomorrow’s sunrise is at {formatTime(sunTimes(dateKey(new Date(now.getTime() + 86_400_000)), loc.lat, loc.lng).sunrise)}.</span>
              ) : (
                <span>
                  Sunset tonight at <strong className="font-semibold text-ink">{formatTime(sun.sunset)}</strong>
                  <span className="text-ink-3"> · golden hour from {formatTime(sun.goldenHour)}</span>
                </span>
              )}
            </p>
            {nudge ? (
              <p className="text-ink-3" style={{ ['--i' as string]: 6 }}>
                {nudge}
              </p>
            ) : null}
          </div>
        </div>

        <Float duration={9} className="page-enter h-full" >
        <div className="photo-settle relative h-full min-h-[260px] overflow-hidden rounded-[26px] text-cream shadow-[var(--shadow-card)] lg:min-h-[300px]">
          <Photo name={cityPhoto(user.citySlug)} priority sizes="(min-width: 1024px) 40vw, 100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/5" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            {season.phase === 'before' ? (
              <>
                <p className="eyebrow !text-cream/80">Summer starts 1 December</p>
                <p className="mt-2 flex items-baseline gap-3">
                  <Counter value={season.daysUntil} className="display text-[4.5rem] leading-none" />
                  <span className="text-lg">days to go</span>
                </p>
              </>
            ) : (
              <>
                <p className="eyebrow !text-cream/80">Day {season.day} of summer</p>
                <p className="mt-2 flex items-baseline gap-3">
                  <Counter value={season.daysLeft} className="display text-[4.5rem] leading-none" />
                  <span className="text-lg">sunny days left</span>
                </p>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/25">
                  <div className="h-full rounded-full bg-sun" style={{ width: `${Math.round(season.progress * 100)}%` }} />
                </div>
              </>
            )}
            {milestone && milestone.label !== 'Summer starts' ? (
              <p className="mt-3 text-sm text-cream/85">
                {milestone.days === 0 ? `Today: ${milestone.label} 🎉` : `${milestone.label} in ${milestone.days} day${milestone.days === 1 ? '' : 's'}`}
              </p>
            ) : null}
          </div>
        </div>
        </Float>
      </section>

      {/* ── Challenge & your summer ── */}
      <section className="stagger mt-10 grid gap-6 lg:grid-cols-[1.45fr_1fr]" style={{ ['--stagger' as string]: '110ms' }}>
        <div className="space-y-4" style={{ ['--i' as string]: 3 }}>
          {daily ? (
            <ChallengeCard c={toChallengeView(daily, categories)} />
          ) : (
            <div className="card p-8 text-ink-3">No challenges are active right now. Check back soon.</div>
          )}
          {weekly ? <ChallengeCard c={toChallengeView(weekly, categories)} variant="compact" daysLeft={daysLeftInWeek(now)} /> : null}
        </div>

        <aside className="card flex flex-col p-6" aria-label="Your summer so far" style={{ ['--i' as string]: 4 }}>
          <div className="flex items-center justify-between">
            <h2 className="display text-[1.9rem]">Your summer</h2>
            <Link href="/challenges" className="text-sm font-medium text-sea-deep hover:underline">
              Badges
            </Link>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3">
            <div className="well px-4 py-3">
              <dt className="eyebrow">Points</dt>
              <dd className="display mt-1 text-4xl">
                <Counter value={points} />
              </dd>
            </div>
            <div className="well px-4 py-3">
              <dt className="eyebrow">Streak</dt>
              <dd className="mt-1 flex items-baseline gap-1.5">
                <span className="display text-4xl">
                  <Counter value={streak.current} />
                </span>
                <span className="text-sm text-ink-3">day{streak.current === 1 ? '' : 's'}</span>
                {streak.current >= 3 ? <Flame size={18} className="text-sun" aria-label="On fire" /> : null}
              </dd>
            </div>
          </dl>
          <div className="mt-6 flex items-center gap-4">
            <ProgressRing value={progress.total ? progress.done / progress.total : 0} size={68} stroke={7} label={`${progress.done} of ${progress.total} bucket list items done`}>
              <span className="text-sm font-semibold">
                {progress.done}/{progress.total}
              </span>
            </ProgressRing>
            <div>
              <p className="font-semibold">Bucket list</p>
              <p className="text-sm text-ink-3">
                {progress.total === 0
                  ? 'Start your summer bucket list.'
                  : progress.done === progress.total
                    ? 'All done — what’s next?'
                    : `${progress.total - progress.done} still to do`}
              </p>
            </div>
          </div>
          <BucketPreview items={bucket.filter((b) => !b.completed_at).slice(0, 3).map((b) => ({ id: b.id, title: b.title }))} />
        </aside>
      </section>

      {/* ── Quick navigation ── */}
      <nav aria-label="Quick links" className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { href: '/explore', label: 'Explore', text: 'Beaches, braai spots & more', icon: Compass },
          { href: '/whats-on', label: 'What’s On?', text: `Events in ${loc.city.name}`, icon: CalendarDays },
          { href: '/challenges', label: 'Challenges', text: 'Badges & history', icon: Trophy },
          { href: '/my-summer', label: 'My Summer', text: 'Memories & bucket list', icon: Sun },
        ].map(({ href, label, text, icon: Icon }, i) => (
          <div key={href} data-reveal="" style={{ ['--i' as string]: i }}>
          <Link href={href} className="card card-hover group flex h-full items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sand text-ink-2 transition-colors duration-300 group-hover:bg-sun-soft group-hover:text-sun-deep">
              <Icon size={19} className="icon-wiggle" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{label}</span>
              <span className="block truncate text-xs text-ink-3">{text}</span>
            </span>
            <ArrowUpRight size={16} className="hidden shrink-0 text-ink-3 transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:block" aria-hidden="true" />
          </Link>
          </div>
        ))}
      </nav>

      {/* ── What's on ── */}
      <section className="mt-14" aria-labelledby="events-heading">
        <SectionHeader title={<span id="events-heading">What’s on near you</span>} href="/whats-on">
          The next three weeks in {loc.city.name}
        </SectionHeader>
        <Suspense fallback={<EventsSkeleton />}>
          <EventsSection user={user} />
        </Suspense>
      </section>

      {/* ── Around you ── */}
      <section className="mt-14" aria-labelledby="nearby-heading">
        <SectionHeader title={<span id="nearby-heading">Around you</span>} href="/explore">
          Editor’s picks and places SOMMR members love{loc.precise ? ' near you' : ` in ${loc.city.name}`}
        </SectionHeader>
        <NearbySection
          lat={loc.lat}
          lng={loc.lng}
          radiusKm={loc.precise ? 8 : 12}
          categories={interestPlaceCategories(user).filter((c) => categories.get(c)?.active && categories.get(c)?.osm_filters.length)}
          categoryInfo={Object.fromEntries([...categories.values()].filter((c) => c.kind === 'place').map((c) => [c.slug, categoryLite(c)!]))}
        />
      </section>

      {/* ── Recommended ── */}
      <section className="mt-14" aria-labelledby="recs-heading">
        <SectionHeader title={<span id="recs-heading">Ideas for your summer</span>} href="/my-summer/bucket-list" linkLabel="Bucket list">
          Picked for what you love — add the ones that speak to you.
        </SectionHeader>
        <Recommendations interests={user.interests} existing={bucket.map((b) => b.suggestion_slug).filter((s): s is string => !!s)} />
      </section>
    </Page>
  );
}
