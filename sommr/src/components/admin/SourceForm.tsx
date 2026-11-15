'use client';

import { useActionState } from 'react';
import { CITIES } from '@/lib/cities';
import { addSourceAction, type AdminFormState } from '@/server/actions/admin';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormMessage, Input, Select } from './FormBits';

export function SourceForm({ categories }: { categories: { slug: string; label: string }[] }) {
  const [state, action] = useActionState<AdminFormState, FormData>(addSourceAction, {});
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Type"
          name="kind"
          state={state}
          options={[
            { value: 'ical', label: 'iCalendar feed (.ics)' },
            { value: 'jsonld', label: 'Web page with schema.org events' },
          ]}
        />
        <Input label="Name" name="name" state={state} required placeholder="Kirstenbosch concerts" />
      </div>
      <Input label="URL" name="url" type="url" state={state} required placeholder="https://…" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="City (if not in the feed)" name="city_slug" state={state} options={[{ value: '', label: 'Work out from venue' }, ...CITIES.map((c) => ({ value: c.slug, label: c.name }))]} />
        <Select label="Default category" name="default_category" state={state} options={[{ value: '', label: 'Classify automatically' }, ...categories.map((c) => ({ value: c.slug, label: c.label }))]} />
      </div>
      <SubmitButton className="btn btn-primary" pendingText="Adding and importing">
        Add source and import
      </SubmitButton>
    </form>
  );
}
