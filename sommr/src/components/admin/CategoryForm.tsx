'use client';

import { useActionState, useState } from 'react';
import { ICON_NAMES, CategoryIcon } from '@/components/ui/Icon';
import { saveCategoryAction, type AdminFormState } from '@/server/actions/admin';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Check, FormMessage, Input, Select, Textarea } from './FormBits';

export interface CategoryFormValues {
  slug: string;
  kind: 'place' | 'event';
  label: string;
  description: string;
  icon: string;
  color: string;
  osm_filters: string[];
  event_categories: string[];
  keywords: string[];
  sort: number;
  active: boolean;
}

export function CategoryForm({ initial, isNew = false }: { initial: CategoryFormValues; isNew?: boolean }) {
  const [state, action] = useActionState<AdminFormState, FormData>(saveCategoryAction, {});
  const [icon, setIcon] = useState(initial.icon);
  const [color, setColor] = useState(initial.color);
  const [kind, setKind] = useState(initial.kind);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="isNew" value={isNew ? '1' : '0'} />
      {!isNew ? <input type="hidden" name="slug" value={initial.slug} /> : null}
      {!isNew ? <input type="hidden" name="kind" value={initial.kind} /> : null}
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${color} 15%, white)`, color }}>
          <CategoryIcon name={icon} size={20} />
        </span>
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <Input label="Label" name="label" state={state} defaultValue={initial.label} required maxLength={40} />
          {isNew ? <Input label="Slug" name="slug" state={state} defaultValue={initial.slug} required /> : <Input label="Order" name="sort" type="number" state={state} defaultValue={String(initial.sort)} />}
        </div>
      </div>
      {isNew ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Type" name="kind" state={state} value={kind} onChange={(e) => setKind(e.target.value as 'place' | 'event')} options={[{ value: 'place', label: 'Place (Explore)' }, { value: 'event', label: 'Event (What’s On)' }]} />
          <Input label="Order" name="sort" type="number" state={state} defaultValue={String(initial.sort)} />
        </div>
      ) : null}
      <Input label="Description" name="description" state={state} defaultValue={initial.description} maxLength={200} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Icon" name="icon" state={state} value={icon} onChange={(e) => setIcon(e.target.value)} options={ICON_NAMES.map((n) => ({ value: n, label: n }))} />
        <div>
          <label className="field-label" htmlFor={`color-${initial.slug}`}>
            Colour
          </label>
          <div className="flex gap-2">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-12 w-14 cursor-pointer rounded-xl border border-line-strong bg-paper p-1" aria-label="Pick colour" />
            <input id={`color-${initial.slug}`} name="color" value={color} onChange={(e) => setColor(e.target.value)} className="input" />
          </div>
          {state.fieldErrors?.color ? <p className="field-error">{state.fieldErrors.color}</p> : null}
        </div>
      </div>
      {kind === 'place' ? (
        <>
          <Textarea label="OpenStreetMap tag filters" name="osm_filters" state={state} defaultValue={initial.osm_filters.join('\n')} rows={3} hint="One per line, e.g. amenity=cafe or leisure=park|garden. Leave empty for event-based categories." />
          <Input label="Show events from these categories (comma separated)" name="event_categories" state={state} defaultValue={initial.event_categories.join(', ')} hint="e.g. festival — puts those events on the map under this category." />
        </>
      ) : (
        <Textarea label="Keywords for classifying imported events" name="keywords" state={state} defaultValue={initial.keywords.join(', ')} rows={2} hint="Comma separated. Matched against event titles and descriptions." />
      )}
      <Check name="active" label="Active" defaultChecked={initial.active} />
      <SubmitButton className="btn btn-primary" pendingText="Saving">
        {isNew ? 'Add category' : 'Save'}
      </SubmitButton>
    </form>
  );
}
