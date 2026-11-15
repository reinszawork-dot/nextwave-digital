import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PreferencesForm } from '@/components/onboarding/PreferencesForm';
import { completeOnboarding } from '@/server/actions/profile';
import { requireUser } from '@/server/auth';

export const metadata: Metadata = { title: 'Set up your summer' };

export default async function OnboardingPage() {
  const user = await requireUser({ allowUnonboarded: true, next: '/onboarding' });
  if (user.onboarded) redirect('/');
  return (
    <>
      <p className="mb-8 text-ink-3">
        Welcome, <span className="font-medium text-ink">{user.displayName}</span> ☀️
      </p>
      <PreferencesForm
        action={completeOnboarding}
        mode="onboarding"
        initial={{ city: user.citySlug, interests: user.interests, lat: user.homeLat, lng: user.homeLng }}
      />
    </>
  );
}
