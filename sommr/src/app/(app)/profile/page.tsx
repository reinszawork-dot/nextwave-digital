import type { Metadata } from 'next';
import Link from 'next/link';
import { LogOut, Shield, Trophy } from 'lucide-react';
import { Page } from '@/components/shell/AppShell';
import { PreferencesForm } from '@/components/onboarding/PreferencesForm';
import { ChangePasswordForm, DeleteAccountForm } from '@/components/profile/AccountForms';
import { Avatar } from '@/components/ui/Avatar';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { getCity } from '@/lib/cities';
import { formatDateWithYear } from '@/lib/time';
import { logoutAction } from '@/app/(auth)/actions';
import { updatePreferences } from '@/server/actions/profile';
import { requireUser } from '@/server/auth';
import { userAchievements } from '@/server/services/achievements';
import { totalPoints } from '@/server/services/challenges';

export const metadata: Metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const user = await requireUser({ next: '/profile' });
  const [points, earned] = await Promise.all([totalPoints(user.id), userAchievements(user.id)]);
  const city = getCity(user.citySlug);
  return (
    <Page>
      <section className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <Avatar name={user.displayName} size={76} />
          <div>
            <h1 className="display text-5xl">{user.displayName}</h1>
            <p className="mt-1 text-ink-3">
              {city?.name ?? 'South Africa'}
              {user.locationMode === 'device' ? ' · using your location' : ''} · member since {formatDateWithYear(user.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.role === 'admin' ? (
            <Link href="/admin" className="btn btn-ghost">
              <Shield size={17} aria-hidden="true" /> Admin
            </Link>
          ) : null}
          <form action={logoutAction}>
            <button type="submit" className="btn btn-ghost">
              <LogOut size={17} aria-hidden="true" /> Sign out
            </button>
          </form>
        </div>
      </section>

      <Link href="/challenges" className="card card-hover mt-8 flex items-center gap-4 p-5">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-sun-soft text-sun-deep">
          <Trophy size={22} aria-hidden="true" />
        </span>
        <span className="flex-1">
          <span className="block font-semibold">
            {points.toLocaleString('en-ZA')} points · {earned.size} of {ACHIEVEMENTS.length} badges
          </span>
          <span className="block text-sm text-ink-3">See your badges and challenge history</span>
        </span>
      </Link>

      <section className="card mt-8 p-6 sm:p-8" aria-labelledby="prefs">
        <h2 id="prefs" className="sr-only">
          Preferences
        </h2>
        <PreferencesForm
          action={updatePreferences}
          mode="settings"
          initial={{ city: user.citySlug, interests: user.interests, lat: user.homeLat, lng: user.homeLng, name: user.displayName }}
        />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-6 sm:p-8" aria-labelledby="security">
          <h2 id="security" className="display mb-1 text-3xl">
            Password
          </h2>
          <p className="mb-5 text-sm text-ink-3">Signed in as {user.email}</p>
          <ChangePasswordForm />
        </section>
        <section className="card p-6 sm:p-8" aria-labelledby="danger">
          <h2 id="danger" className="display mb-3 text-3xl">
            Delete account
          </h2>
          <DeleteAccountForm />
        </section>
      </div>

      <p className="mt-8 text-xs leading-relaxed text-ink-3">
        Your memories and photos are private to you. If you share your location, we store it rounded to about 100 m and only use it for nearby suggestions.
      </p>
    </Page>
  );
}
