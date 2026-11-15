import type { Metadata } from 'next';
import { Page } from '@/components/shell/AppShell';
import { SubmitEventForm } from '@/components/submit/SubmitForms';
import { requireUser } from '@/server/auth';
import { getCategories } from '@/server/services/categories';

export const metadata: Metadata = { title: 'Suggest an event' };

export default async function SubmitEventPage() {
  await requireUser({ next: '/submit/event' });
  const categories = await getCategories('event');
  return (
    <Page>
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">What’s On?</p>
        <h1 className="display mt-2 text-5xl">Suggest an event</h1>
        <p className="mt-3 text-ink-3">Know about something great? Share the official listing and we’ll verify it before it goes live.</p>
        <div className="card mt-8 p-6 sm:p-8">
          <SubmitEventForm categories={categories.map((c) => ({ slug: c.slug, label: c.label }))} />
        </div>
      </div>
    </Page>
  );
}
