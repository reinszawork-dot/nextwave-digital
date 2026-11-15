'use client';

import Image from 'next/image';
import { useActionState, useState, useTransition } from 'react';
import { Check, LocateFixed, MapPin } from 'lucide-react';
import { CITIES, EVENT_CITIES } from '@/lib/cities';
import { INTERESTS } from '@/lib/interests';
import { PHOTOS } from '@/lib/photos';
import { locate, type PrefsState } from '@/server/actions/profile';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Spinner } from '@/components/ui/Spinner';

type Action = (state: PrefsState, form: FormData) => Promise<PrefsState>;

export function PreferencesForm({
  action,
  initial,
  mode,
}: {
  action: Action;
  initial: { city: string | null; interests: string[]; lat: number | null; lng: number | null; name?: string };
  mode: 'onboarding' | 'settings';
}) {
  const [state, formAction] = useActionState<PrefsState, FormData>(action, {});
  const [step, setStep] = useState(mode === 'onboarding' ? 0 : -1);
  const [city, setCity] = useState(initial.city ?? '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial.lat != null && initial.lng != null ? { lat: initial.lat, lng: initial.lng } : null,
  );
  const [area, setArea] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [locError, setLocError] = useState<string | null>(null);
  const [locating, startLocating] = useTransition();

  const useMyLocation = () => {
    setLocError(null);
    if (!('geolocation' in navigator)) {
      setLocError('Your browser can’t share its location. Pick a city instead.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        startLocating(async () => {
          const res = await locate(pos.coords.latitude, pos.coords.longitude);
          if ('error' in res) {
            setLocError(res.error);
            return;
          }
          setCity(res.city);
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setArea(res.area ? `${res.area}, near ${res.cityName}` : `Near ${res.cityName}`);
        }),
      (err) =>
        setLocError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was declined — that’s fine, just pick your city.'
            : 'We couldn’t get your location right now. Pick your city instead.',
        ),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 600_000 },
    );
  };

  const toggle = (slug: string) =>
    setInterests((xs) => (xs.includes(slug) ? xs.filter((x) => x !== slug) : [...xs, slug]));

  const showCity = step === 0 || step === -1;
  const showInterests = step === 1 || step === -1;
  const otherCities = CITIES.filter((c) => !c.events);

  return (
    <form action={formAction} className="space-y-10">
      <input type="hidden" name="city" value={city} />
      {coords ? (
        <>
          <input type="hidden" name="lat" value={coords.lat} />
          <input type="hidden" name="lng" value={coords.lng} />
        </>
      ) : null}
      {interests.map((i) => (
        <input key={i} type="hidden" name="interests" value={i} />
      ))}

      {mode === 'settings' ? (
        <div className="max-w-sm">
          <label className="field-label" htmlFor="pref-name">
            Your name
          </label>
          <input id="pref-name" name="name" className="input" defaultValue={initial.name} maxLength={60} required />
        </div>
      ) : null}

      {showCity && (
        <section key="city" className={mode === 'onboarding' ? 'page-enter' : ''} aria-labelledby="city-heading">
          {mode === 'onboarding' ? (
            <>
              <p className="eyebrow">Step 1 of 2</p>
              <h1 id="city-heading" className="display mt-2 text-4xl sm:text-5xl">
                Where are you spending summer?
              </h1>
              <p className="mt-3 max-w-lg text-ink-3">
                We’ll show you places, events and challenges nearby. You can change this any time.
              </p>
            </>
          ) : (
            <h2 id="city-heading" className="display text-3xl">
              Your summer base
            </h2>
          )}

          <button type="button" onClick={useMyLocation} disabled={locating} className="btn btn-soft mt-6">
            {locating ? <Spinner /> : <LocateFixed size={18} aria-hidden="true" />}
            {locating ? 'Finding you' : 'Use my location'}
          </button>
          {area ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-leaf" role="status">
              <MapPin size={15} aria-hidden="true" /> {area} — we’ll use your exact spot for nearby suggestions.
            </p>
          ) : null}
          {locError ? (
            <p className="mt-3 text-sm text-ink-3" role="status">
              {locError}
            </p>
          ) : null}

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="City">
            {EVENT_CITIES.map((c) => {
              const active = city === c.slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setCity(c.slug);
                    if (coords && !area) setCoords(null);
                  }}
                  className={`card card-hover relative flex h-24 flex-col justify-end p-4 text-left transition-colors ${
                    active ? '!border-ink !bg-ink text-cream' : ''
                  }`}
                >
                  {active ? <Check size={16} className="absolute right-3 top-3" aria-hidden="true" /> : null}
                  <span className="text-base font-semibold">{c.name}</span>
                  <span className={`text-xs ${active ? 'text-cream/70' : 'text-ink-3'}`}>{c.province}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 max-w-sm">
            <label className="field-label" htmlFor="other-city">
              Somewhere else?
            </label>
            <select
              id="other-city"
              className="select"
              value={otherCities.some((c) => c.slug === city) ? city : ''}
              onChange={(e) => e.target.value && setCity(e.target.value)}
            >
              <option value="">Choose a town</option>
              {otherCities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}, {c.province}
                </option>
              ))}
            </select>
          </div>
          {mode === 'onboarding' ? (
            <div className="mt-10 flex justify-end">
              <button type="button" className="btn btn-primary btn-lg" disabled={!city} onClick={() => setStep(1)}>
                Continue
              </button>
            </div>
          ) : null}
        </section>
      )}

      {showInterests && (
        <section key="interests" className={mode === 'onboarding' ? 'page-enter' : ''} aria-labelledby="interests-heading">
          {mode === 'onboarding' ? (
            <>
              <p className="eyebrow">Step 2 of 2</p>
              <h1 id="interests-heading" className="display mt-2 text-4xl sm:text-5xl">
                What makes it summer for you?
              </h1>
              <p className="mt-3 max-w-lg text-ink-3">Pick as many as you like. We’ll tune your challenges and picks to match.</p>
            </>
          ) : (
            <h2 id="interests-heading" className="display text-3xl">
              What you love
            </h2>
          )}
          <div className="stagger mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {INTERESTS.map((it, i) => {
              const active = interests.includes(it.slug);
              const photo = PHOTOS[it.photo];
              return (
                <button
                  key={it.slug}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(it.slug)}
                  style={{ ['--i' as string]: i }}
                  className={`group relative aspect-[4/5] overflow-hidden rounded-[20px] text-left outline-offset-4 transition-all duration-300 ${
                    active ? 'ring-[3px] ring-sun ring-offset-2 ring-offset-cream' : ''
                  }`}
                >
                  <Image src={photo.src} alt="" fill sizes="(min-width: 768px) 22vw, 45vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <span
                    className={`absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border transition-all ${
                      active ? 'border-sun bg-sun text-white' : 'border-white/70 bg-black/10 text-transparent'
                    }`}
                  >
                    <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  <span className="absolute inset-x-0 bottom-0 p-3.5 text-white">
                    <span className="block text-[0.98rem] font-semibold leading-tight">{it.label}</span>
                    <span className="mt-1 hidden text-xs leading-snug text-white/80 sm:block">{it.blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {state.error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="rounded-2xl bg-leaf-soft px-4 py-3 text-sm text-[#436b39]">
          Saved. Your recommendations will update right away.
        </p>
      ) : null}

      {(step === 1 || step === -1) && (
        <div className={`flex items-center gap-3 ${mode === 'onboarding' ? 'justify-between' : ''}`}>
          {mode === 'onboarding' ? (
            <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>
              Back
            </button>
          ) : null}
          <SubmitButton
            className="btn btn-primary btn-lg"
            disabled={!city || interests.length === 0}
            pendingText={mode === 'onboarding' ? 'Setting up your summer' : 'Saving'}
          >
            {mode === 'onboarding' ? 'Start my summer' : 'Save preferences'}
          </SubmitButton>
        </div>
      )}
    </form>
  );
}
