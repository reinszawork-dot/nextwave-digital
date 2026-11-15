'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { CircleCheck } from 'lucide-react';
import { CITIES } from '@/lib/cities';
import { submitEventAction, submitPlaceAction, type SubmitState } from '@/server/actions/submit';
import { SubmitButton } from '@/components/ui/SubmitButton';

function Err({ state, name }: { state: SubmitState; name: string }) {
  return state.fieldErrors?.[name] ? <p className="field-error">{state.fieldErrors[name]}</p> : null;
}

function Thanks({ what }: { what: string }) {
  return (
    <div className="py-6 text-center page-enter">
      <CircleCheck size={40} className="mx-auto text-leaf" aria-hidden="true" />
      <h2 className="display mt-4 text-3xl">Thank you!</h2>
      <p className="mx-auto mt-2 max-w-sm text-ink-3">Our team will check your {what} against an official source. Once it’s verified, it’ll appear for everyone.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Back home
      </Link>
    </div>
  );
}

export function SubmitEventForm({ categories }: { categories: { slug: string; label: string }[] }) {
  const [state, action] = useActionState<SubmitState, FormData>(submitEventAction, {});
  if (state.ok) return <Thanks what="event" />;
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">{state.error}</p> : null}
      <div>
        <label className="field-label" htmlFor="s-title">Event name</label>
        <input id="s-title" name="title" className="input" maxLength={200} required />
        <Err state={state} name="title" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="s-start">Starts</label>
          <input id="s-start" name="starts_at" type="datetime-local" className="input" required />
          <Err state={state} name="starts_at" />
        </div>
        <div>
          <label className="field-label" htmlFor="s-cat">Type</label>
          <select id="s-cat" name="category_slug" className="select" defaultValue="">
            <option value="">Choose…</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
          <Err state={state} name="category_slug" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="s-venue">Venue</label>
          <input id="s-venue" name="venue_name" className="input" maxLength={200} required />
          <Err state={state} name="venue_name" />
        </div>
        <div>
          <label className="field-label" htmlFor="s-city">City</label>
          <select id="s-city" name="city_slug" className="select" defaultValue="">
            <option value="">Choose…</option>
            {CITIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
          <Err state={state} name="city_slug" />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="s-link">Link to the official listing or tickets</label>
        <input id="s-link" name="link" type="url" className="input" placeholder="https://" required />
        <Err state={state} name="link" />
      </div>
      <div>
        <label className="field-label" htmlFor="s-desc">Anything else? <span className="font-normal text-ink-3">(optional)</span></label>
        <textarea id="s-desc" name="description" className="textarea" maxLength={2000} />
      </div>
      <SubmitButton className="btn btn-primary btn-lg" pendingText="Sending">Send for review</SubmitButton>
    </form>
  );
}

export function SubmitPlaceForm({ categories }: { categories: { slug: string; label: string }[] }) {
  const [state, action] = useActionState<SubmitState, FormData>(submitPlaceAction, {});
  if (state.ok) return <Thanks what="place" />;
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">{state.error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="p-name">Name</label>
          <input id="p-name" name="name" className="input" maxLength={200} required />
          <Err state={state} name="name" />
        </div>
        <div>
          <label className="field-label" htmlFor="p-cat">Category</label>
          <select id="p-cat" name="category_slug" className="select" defaultValue="">
            <option value="">Choose…</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
          <Err state={state} name="category_slug" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="p-addr">Address or landmark</label>
          <input id="p-addr" name="address" className="input" maxLength={300} required />
          <Err state={state} name="address" />
        </div>
        <div>
          <label className="field-label" htmlFor="p-city">Nearest town</label>
          <select id="p-city" name="city_slug" className="select" defaultValue="">
            <option value="">Choose…</option>
            {CITIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
          <Err state={state} name="city_slug" />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="p-web">Website <span className="font-normal text-ink-3">(optional)</span></label>
        <input id="p-web" name="website" type="url" className="input" placeholder="https://" />
        <Err state={state} name="website" />
      </div>
      <div>
        <label className="field-label" htmlFor="p-desc">Why should people go? <span className="font-normal text-ink-3">(optional)</span></label>
        <textarea id="p-desc" name="description" className="textarea" maxLength={1000} />
      </div>
      <SubmitButton className="btn btn-primary btn-lg" pendingText="Sending">Send for review</SubmitButton>
    </form>
  );
}
