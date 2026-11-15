'use client';

import { useActionState } from 'react';
import { INTERESTS } from '@/lib/interests';
import { saveChallengeAction, type AdminFormState } from '@/server/actions/admin';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Check, FormMessage, Input, Select, Textarea } from './FormBits';

export interface ChallengeFormValues {
  id?: string;
  slug: string;
  kind: string;
  title: string;
  description: string;
  tip: string;
  interests: string[];
  cost: string;
  points: string;
  place_category: string;
  coastal_only: boolean;
  months: number[];
  active: boolean;
  featured: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ChallengeForm({ initial, placeCategories }: { initial: ChallengeFormValues; placeCategories: { slug: string; label: string }[] }) {
  const [state, action] = useActionState<AdminFormState, FormData>(saveChallengeAction, {});
  return (
    <form action={action} className="space-y-6" noValidate>
      <FormMessage state={state} />
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Input label="Title" name="title" state={state} defaultValue={initial.title} required maxLength={120} />
        <Input label="Slug" name="slug" state={state} defaultValue={initial.slug} required pattern="[a-z0-9-]+" />
      </div>
      <Textarea label="Description" name="description" state={state} defaultValue={initial.description} required maxLength={500} rows={3} />
      <Input label="Tip (optional)" name="tip" state={state} defaultValue={initial.tip} maxLength={300} />
      <div className="grid gap-4 sm:grid-cols-4">
        <Select label="Kind" name="kind" state={state} defaultValue={initial.kind} options={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }]} />
        <Select label="Cost" name="cost" state={state} defaultValue={initial.cost} options={[{ value: 'free', label: 'Free' }, { value: 'low', label: 'Low cost' }, { value: 'medium', label: 'Treat' }]} />
        <Input label="Points" name="points" type="number" min={1} max={500} state={state} defaultValue={initial.points} />
        <Select label="Explore link" name="place_category" state={state} defaultValue={initial.place_category} options={[{ value: '', label: 'None' }, ...placeCategories.map((c) => ({ value: c.slug, label: c.label }))]} />
      </div>
      <fieldset>
        <legend className="field-label">Suits these interests (none = everyone)</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {INTERESTS.map((i) => (
            <Check key={i.slug} name="interests" label={i.label} defaultChecked={initial.interests.includes(i.slug)} />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="field-label">Only in these months (none = all year)</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {MONTHS.map((m, i) => (
            <label key={m} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="months" value={i + 1} defaultChecked={initial.months.includes(i + 1)} className="accent-[var(--color-sun-deep)]" /> {m}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-3">
        <Check name="coastal_only" label="Coastal towns only" defaultChecked={initial.coastal_only} hint="For beach and ocean challenges." />
        <Check name="active" label="Active" defaultChecked={initial.active} />
        <Check name="featured" label="Featured — offered more often" defaultChecked={initial.featured} />
      </div>
      <SubmitButton className="btn btn-primary btn-lg" pendingText="Saving">
        {initial.id ? 'Save changes' : 'Create challenge'}
      </SubmitButton>
    </form>
  );
}
