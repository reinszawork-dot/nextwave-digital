'use client';

import { useActionState, useRef, useState, useTransition } from 'react';
import { LocateFixed } from 'lucide-react';
import { geocodeAction, savePlaceAction, type AdminFormState } from '@/server/actions/admin';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Spinner } from '@/components/ui/Spinner';
import { Check, FormMessage, Input, Select, Textarea } from './FormBits';

export interface PlaceFormValues {
  id?: string;
  source?: string;
  name: string;
  category_slug: string;
  lat: string;
  lng: string;
  address: string;
  suburb: string;
  city: string;
  description: string;
  website: string;
  phone: string;
  opening_hours: string;
  status: string;
  featured: boolean;
  featured_note: string;
}

export function PlaceForm({ initial, categories }: { initial: PlaceFormValues; categories: { slug: string; label: string }[] }) {
  const [state, action] = useActionState<AdminFormState, FormData>(savePlaceAction, {});
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const val = (n: string) => (ref.current?.elements.namedItem(n) as HTMLInputElement | null)?.value ?? '';
  return (
    <form ref={ref} action={action} className="space-y-6" noValidate>
      <FormMessage state={state} />
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {initial.source === 'osm' ? (
        <p className="rounded-2xl bg-sea-soft px-4 py-3 text-sm text-sea-deep">
          This place comes from OpenStreetMap. Your corrections here are kept when it re-syncs — consider fixing it on OpenStreetMap too, so everyone benefits.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" name="name" state={state} defaultValue={initial.name} required maxLength={200} />
        <Select label="Category" name="category_slug" state={state} defaultValue={initial.category_slug} options={[{ value: '', label: 'Choose…' }, ...categories.map((c) => ({ value: c.slug, label: c.label }))]} />
      </div>
      <Input label="Street address" name="address" state={state} defaultValue={initial.address} maxLength={300} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Suburb" name="suburb" state={state} defaultValue={initial.suburb} maxLength={120} />
        <Input label="Town / city" name="city" state={state} defaultValue={initial.city} maxLength={120} />
      </div>
      <div className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <Input label="Latitude" name="lat" state={state} defaultValue={initial.lat} inputMode="decimal" required />
        <Input label="Longitude" name="lng" state={state} defaultValue={initial.lng} inputMode="decimal" required />
        <button
          type="button"
          className="btn btn-ghost mb-[1px]"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await geocodeAction([val('name'), val('address'), val('suburb'), val('city')].filter(Boolean).join(', '));
              if (r.error || r.lat == null) return setNote(r.error ?? 'Not found');
              (ref.current!.elements.namedItem('lat') as HTMLInputElement).value = r.lat.toFixed(6);
              (ref.current!.elements.namedItem('lng') as HTMLInputElement).value = r.lng!.toFixed(6);
              setNote('Coordinates found.');
            })
          }
        >
          {pending ? <Spinner /> : <LocateFixed size={16} aria-hidden="true" />} Find coordinates
        </button>
      </div>
      {note ? <p className="text-sm text-ink-3">{note}</p> : null}
      <Textarea label="Description" name="description" state={state} defaultValue={initial.description} maxLength={2000} rows={4} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Website" name="website" type="url" state={state} defaultValue={initial.website} placeholder="https://" />
        <Input label="Phone" name="phone" state={state} defaultValue={initial.phone} maxLength={40} />
      </div>
      <Input label="Opening hours" name="opening_hours" state={state} defaultValue={initial.opening_hours} hint="OpenStreetMap format, e.g. Mo-Fr 08:00-17:00; Sa 09:00-13:00" />
      <Select
        label="Status"
        name="status"
        state={state}
        defaultValue={initial.status}
        options={[
          { value: 'published', label: 'Published' },
          { value: 'pending', label: 'Pending review' },
          { value: 'hidden', label: 'Hidden' },
          { value: 'rejected', label: 'Rejected' },
        ]}
      />
      <div className="well space-y-3 p-5">
        <Check name="featured" label="Feature as an editor’s pick" defaultChecked={initial.featured} />
        <Input label="Why we love it (optional)" name="featured_note" state={state} defaultValue={initial.featured_note} maxLength={300} />
      </div>
      <SubmitButton className="btn btn-primary btn-lg" pendingText="Saving">
        {initial.id ? 'Save changes' : 'Create place'}
      </SubmitButton>
    </form>
  );
}
