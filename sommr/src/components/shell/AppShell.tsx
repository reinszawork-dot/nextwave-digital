import Link from 'next/link';
import { ViewTransition } from 'react';
import { Shield } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { WordReveal } from '@/components/motion/WordReveal';
import { Logo } from '@/components/ui/Logo';
import { getCity } from '@/lib/cities';
import { seasonState } from '@/lib/season';
import type { SessionUser } from '@/server/auth';
import { BottomNav, SidebarNav } from './NavLinks';

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const season = seasonState();
  const city = getCity(user.citySlug);
  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-[100] rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
      >
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-w)] flex-col border-r border-line bg-cream px-5 py-7 lg:flex">
        <Link href="/" aria-label="SOMMR home" className="px-2">
          <Logo />
        </Link>
        <SidebarNav />
        <div className="mt-auto space-y-3">
          <div className="well px-4 py-3.5">
            <p className="eyebrow">{season.phase === 'before' ? 'Summer starts in' : 'Summer'}</p>
            <p className="mt-1 text-sm text-ink-2">
              {season.phase === 'before' ? (
                <>
                  <span className="display text-2xl text-ink">{season.daysUntil}</span> days
                </>
              ) : (
                <>
                  Day <span className="display text-2xl text-ink">{season.day}</span> of {season.totalDays}
                </>
              )}
            </p>
            {season.phase === 'during' ? (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-sand-2">
                <div className="h-full rounded-full bg-sun" style={{ width: `${Math.round(season.progress * 100)}%` }} />
              </div>
            ) : null}
          </div>
          {user.role === 'admin' ? (
            <Link href="/admin" className="flex h-10 items-center gap-2.5 rounded-2xl px-3.5 text-sm font-medium text-ink-2 hover:bg-sand">
              <Shield size={17} className="text-ink-3" aria-hidden="true" /> Admin
            </Link>
          ) : null}
          <Link href="/profile" className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-sand">
            <Avatar name={user.displayName} size={36} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{user.displayName}</span>
              <span className="block truncate text-xs text-ink-3">{city?.name ?? 'South Africa'}</span>
            </span>
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line/70 bg-cream/85 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/" aria-label="SOMMR home">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          {user.role === 'admin' ? (
            <Link href="/admin" className="btn btn-icon btn-sm text-ink-2" aria-label="Admin">
              <Shield size={18} aria-hidden="true" />
            </Link>
          ) : null}
          <Link href="/profile" aria-label="Your profile" className="rounded-full p-1">
            <Avatar name={user.displayName} size={32} />
          </Link>
        </div>
      </header>

      <div className="lg:pl-[var(--sidebar-w)]">{children}</div>
      <BottomNav />
    </div>
  );
}

/**
 * Page transitions: content fades and rises in as the old page fades up and out.
 * Links into a detail view can pass transitionTypes={['nav-forward']} (and back
 * links ['nav-back']) for a directional slide instead.
 */
export const PAGE_TRANSITION = {
  enter: { 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'page' },
  exit: { 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'page' },
} as const;

/** Standard page container with generous, responsive spacing. */
export function Page({ children, className = '', wide = false }: { children: React.ReactNode; className?: string; wide?: boolean }) {
  return (
    <ViewTransition enter={PAGE_TRANSITION.enter} exit={PAGE_TRANSITION.exit} default="none">
      <main
        id="main"
        className={`mx-auto w-full ${wide ? 'max-w-[1320px]' : 'max-w-[1160px]'} px-4 pb-[calc(var(--bottom-nav-h)+40px)] pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10 ${className}`}
      >
        {children}
      </main>
    </ViewTransition>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-10">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="eyebrow fade-in" style={{ animationDuration: '700ms' }}>
            {eyebrow}
          </p>
        ) : null}
        <h1 className="display mt-2 text-[2.6rem] sm:text-5xl lg:text-[3.6rem]">
          <WordReveal>{title}</WordReveal>
        </h1>
        {children ? (
          <div className="page-enter mt-3 max-w-2xl text-[1.02rem] leading-relaxed text-ink-3" style={{ animationDelay: '260ms' }}>
            {children}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="page-enter flex shrink-0 flex-wrap gap-2" style={{ animationDelay: '340ms' }}>
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export function SectionHeader({ title, href, linkLabel = 'See all', children }: { title: React.ReactNode; href?: string; linkLabel?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="display text-[1.9rem] leading-none sm:text-[2.1rem]">
          <WordReveal trigger="scroll">{title}</WordReveal>
        </h2>
        {children ? (
          <p data-reveal="fade" className="mt-1.5 text-sm text-ink-3" style={{ ['--i' as string]: 3 }}>
            {children}
          </p>
        ) : null}
      </div>
      {href ? (
        <Link href={href} className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-sea-deep">
          <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-500 ease-[var(--ease-soft)] group-hover:bg-[length:100%_1px]">
            {linkLabel}
          </span>
          <span className="transition-transform duration-500 ease-[var(--ease-spring)] group-hover:translate-x-1" aria-hidden="true">
            →
          </span>
        </Link>
      ) : null}
    </div>
  );
}
