'use client';

import { useActionState, useRef, useState, useTransition } from 'react';
import { Download, LocateFixed } from 'lucide-react';
import { CITIES } from '@/lib/cities';
import { fetchEventFromUrlAction, geocodeAction, saveEventAction, type AdminFormState } from '@/server/actions/admin';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Spinner } from '@/components/ui/Spinner';
import { Check, FormMessage, Input, Select, Textarea } from './FormBits';

export interface EventFormValues {
  id?: string;
  source?: string;
  lockedFields?: string[];
  title: string;
  description: string;
  category_slug: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  venue_name: string;
  address: string;
  city_slug: string;
  lat: string;
  lng: string;
  price_min: string;
  price_max: string;
  is_free: boolean;
  ticket_url: string;
  image_url: string;
  organiser: string;
  status: string;
  featured: boolean;
  featured_note: string;
}

export function EventForm({ initial, categories }: { initial: EventFormValues; categories: { slug: string; label: string }[] }) {
  const [state, action] = useActionState<AdminFormState, FormData>(saveEventAction, {});
  const [values, setValues] = useState(initial);
  const [formKey, setFormKey] = useState(0);
  const [importUrl, setImportUrl] = useState('');
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const imported = initial.source && !['admin', 'community'].includes(initial.source);

  const field = (name: keyof EventFormValues) => (formRef.current?.elements.namedItem(name) as HTMLInputElement | null)?.value ?? '';

  return (
    <div className="space-y-6">
      {!initial.id ? (
        <div className="well p-5">
          <label className="field-label" htmlFor="import-url">
            Import details from an event page
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id="import-url" className="input" placeholder="https://… (Quicket, Howler, Webtickets, venue site)" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} />
            <button
              type="button"
              className="btn btn-ghost shrink-0"
              disabled={pending || !importUrl}
              onClick={() =>
                start(async () => {
                  const r = await fetchEventFromUrlAction(importUrl);
                  if (r.error) return setNote({ tone: 'error', text: r.error });
                  setValues((v) => ({ ...v, ...(r.event as Partial<EventFormValues>) }));
                  setFormKey((k) => k + 1);
                  setNote({ tone: 'ok', text: r.message ?? 'Filled in.' });
                })
              }
            >
              {pending ? <Spinner /> : <Download size={16} aria-hidden="true" />} Fetch details
            </button>
          </div>
          <p className="field-hint">Reads the schema.org event data most ticketing pages publish. Nothing is saved until you press Save.</p>
          {note ? <p className={`mt-2 text-sm ${note.tone === 'ok' ? 'text-leaf' : 'text-danger'}`}>{note.text}</p> : null}
        </div>
      ) : null}

      <form key={formKey} ref={formRef} action={action} className="space-y-6" noValidate>
        <FormMessage state={state} />
        {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
        {imported && initial.lockedFields?.length ? (
          <div className="rounded-2xl bg-sea-soft px-4 py-3 text-sm text-sea-deep">
            <p>
              Corrected fields kept during imports: <strong>{initial.lockedFields.join(', ')}</strong>
            </p>
            <div className="mt-2">
              <Check name="unlock" label="Accept the source’s values again on the next import" />
            </div>
          </div>
        ) : null}

        <Input label="Title" name="title" state={state} defaultValue={values.title} required maxLength={200} />
        <Textarea label="Description" name="description" state={state} defaultValue={values.description} maxLength={5000} rows={6} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Category" name="category_slug" state={state} defaultValue={values.category_slug} options={[{ value: '', label: 'Choose…' }, ...categories.map((c) => ({ value: c.slug, label: c.label }))]} />
          <Select
            label="Status"
            name="status"
            state={state}
            defaultValue={values.status}
            options={[
              { value: 'published', label: 'Published' },
              { value: 'pending', label: 'Pending review' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'rejected', label: 'Rejected / hidden' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Starts (SAST)" name="starts_at" type="datetime-local" state={state} defaultValue={values.starts_at} required />
          <Input label="Ends (SAST, optional)" name="ends_at" type="datetime-local" state={state} defaultValue={values.ends_at} />
        </div>
        <Check name="all_day" label="All-day event" defaultChecked={values.all_day} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Venue" name="venue_name" state={state} defaultValue={values.venue_name} maxLength={200} />
          <Select label="City" name="city_slug" state={state} defaultValue={values.city_slug} options={[{ value: '', label: 'Work out from location' }, ...CITIES.map((c) => ({ value: c.slug, label: c.name }))]} />
        </div>
        <Input label="Address" name="address" state={state} defaultValue={values.address} maxLength={300} />
        <div className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <Input label="Latitude" name="lat" state={state} defaultValue={values.lat} inputMode="decimal" placeholder="-33.92" />
          <Input label="Longitude" name="lng" state={state} defaultValue={values.lng} inputMode="decimal" placeholder="18.42" />
          <button
            type="button"
            className="btn btn-ghost mb-[1px]"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const city = CITIES.find((c) => c.slug === field('city_slug'))?.name ?? '';
                const r = await geocodeAction([field('venue_name'), field('address'), city].filter(Boolean).join(', '));
                if (r.error || r.lat == null) return setNote({ tone: 'error', text: r.error ?? 'Not found' });
                (formRef.current!.elements.namedItem('lat') as HTMLInputElement).value = r.lat.toFixed(6);
                (formRef.current!.elements.namedItem('lng') as HTMLInputElement).value = r.lng!.toFixed(6);
                setNote({ tone: 'ok', text: 'Coordinates found — check the pin after saving.' });
              })
            }
          >
            {pending ? <Spinner /> : <LocateFixed size={16} aria-hidden="true" />} Find coordinates
          </button>
        </div>
        {note && initial.id ? <p className={`text-sm ${note.tone === 'ok' ? 'text-leaf' : 'text-danger'}`}>{note.text}</p> : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Price from (R)" name="price_min" state={state} defaultValue={values.price_min} inputMode="decimal" />
          <Input label="Price to (R)" name="price_max" state={state} defaultValue={values.price_max} inputMode="decimal" />
          <div className="flex items-end pb-3">
            <Check name="is_free" label="Free entry" defaultChecked={values.is_free} />
          </div>
        </div>
        <Input label="Ticket / info link" name="ticket_url" type="url" state={state} defaultValue={values.ticket_url} placeholder="https://" />
        <Input label="Image URL" name="image_url" type="url" state={state} defaultValue={values.image_url} placeholder="https://" hint="Only use images you have the right to show (e.g. the organiser’s own)." />
        <Input label="Organiser" name="organiser" state={state} defaultValue={values.organiser} maxLength={200} />

        <div className="well space-y-3 p-5">
          <Check name="featured" label="Feature as an editor’s pick" defaultChecked={values.featured} hint="Shown first on dashboards and lists." />
          <Input label="Why we love it (optional)" name="featured_note" state={state} defaultValue={values.featured_note} maxLength={300} />
        </div>

        <SubmitButton className="btn btn-primary btn-lg" pendingText="Saving">
          {initial.id ? 'Save changes' : 'Create event'}
        </SubmitButton>
      </form>
    </div>
  );
}
