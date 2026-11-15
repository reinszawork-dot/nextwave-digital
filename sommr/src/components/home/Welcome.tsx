import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Photo } from '@/components/ui/Photo';
import type { PhotoKey } from '@/lib/photos';
import { seasonState } from '@/lib/season';

const FEATURES: { title: string; text: string; photo: PhotoKey; tag: string }[] = [
  { tag: 'Explore', title: 'Find your spot', text: 'Beaches, braai spots, markets, viewpoints and coffee — on a map of real places across South Africa.', photo: 'blyde-canyon' },
  { tag: 'What’s On?', title: 'Know what’s happening', text: 'Gigs, festivals, Christmas markets and summer parties in Joburg, Cape Town, Pretoria and Durban.', photo: 'festival' },
  { tag: 'Challenges', title: 'One small adventure a day', text: 'A fresh, mostly-free summer challenge every day — plus a bigger one each week. Collect points and badges.', photo: 'beach-sunset' },
  { tag: 'My Summer', title: 'Keep the good bits', text: 'A bucket list, a photo journal and a timeline of everything you did this summer.', photo: 'park-friends' },
];

export function Welcome() {
  const season = seasonState();
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-2" aria-label="Account">
          <Link href="/login" className="btn btn-sm text-ink-2 hover:bg-sand">
            Sign in
          </Link>
          <Link href="/register" className="btn btn-primary btn-sm">
            Get started
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-[1240px] px-3 sm:px-6">
          <div className="relative h-[78vh] min-h-[520px] overflow-hidden rounded-[30px] text-cream">
            <Photo name="camps-bay" priority sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-12">
              <p className="eyebrow !text-cream/80 page-enter">
                {season.phase === 'before' ? `${season.daysUntil} days until summer` : `Day ${season.day} of summer`} · South Africa
              </p>
              <h1 className="display page-enter mt-4 max-w-3xl text-[3.4rem] sm:text-7xl lg:text-[6.2rem]" style={{ animationDelay: '80ms' }}>
                Make this summer <em className="text-[#f7c79e]">count</em>.
              </h1>
              <p className="page-enter mt-5 max-w-xl text-lg text-cream/90" style={{ animationDelay: '160ms' }}>
                Discover places and events near you, take on a daily summer challenge and keep the memories — all in one calm, beautiful place.
              </p>
              <div className="page-enter mt-8 flex flex-wrap gap-3" style={{ animationDelay: '240ms' }}>
                <Link href="/register" className="btn btn-lg bg-cream text-ink hover:bg-white">
                  Start your summer <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link href="/login" className="btn btn-lg border border-white/40 text-cream hover:bg-white/10">
                  I have an account
                </Link>
              </div>
            </div>
            <p className="absolute right-5 top-5 rounded-full bg-black/25 px-3 py-1 text-xs text-cream/85 backdrop-blur">Camps Bay, Cape Town</p>
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:py-28">
          <div className="max-w-2xl">
            <p className="eyebrow">What’s inside</p>
            <h2 className="display mt-3 text-5xl lg:text-6xl">Everything a South African summer needs.</h2>
          </div>
          <div className="stagger mt-12 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <article key={f.tag} className="card group overflow-hidden" style={{ ['--i' as string]: i }}>
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Photo name={f.photo} sizes="(min-width: 640px) 50vw, 100vw" className="transition-transform duration-700 group-hover:scale-105" />
                </div>
                <div className="p-6">
                  <p className="eyebrow !text-sun-deep">{f.tag}</p>
                  <h3 className="display mt-2 text-3xl">{f.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink-3">{f.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-5 pb-24 sm:px-8">
          <div className="grid gap-8 rounded-[30px] bg-ink px-6 py-12 text-cream sm:px-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <h2 className="display text-4xl sm:text-5xl">Real places. Real events. No filler.</h2>
              <p className="mt-4 max-w-xl leading-relaxed text-cream/75">
                Places come from OpenStreetMap, events from ticketing partners and our own team. If we can’t verify it, we don’t list it — and past events disappear on their own.
              </p>
            </div>
            <div className="lg:text-right">
              <Link href="/register" className="btn btn-lg bg-sun-deep text-white hover:bg-[#8f431f]">
                Create your free account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-5 py-8 text-xs text-ink-3 sm:flex-row sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} SOMMR · A NextWave Digital app</p>
          <p>
            Map data © <a className="underline" href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · Photography via{' '}
            <a className="underline" href="https://unsplash.com">Unsplash</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
