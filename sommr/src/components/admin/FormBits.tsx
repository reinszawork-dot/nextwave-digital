'use client';

import type { AdminFormState } from '@/server/actions/admin';

export function FormMessage({ state }: { state: AdminFormState }) {
  if (state.error)
    return (
      <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="rounded-2xl bg-leaf-soft px-4 py-3 text-sm text-[#436b39]">
        {state.message ?? 'Saved.'}
      </p>
    );
  return null;
}

export function Input({
  label,
  name,
  state,
  hint,
  className = '',
  ...rest
}: { label: string; name: string; state: AdminFormState; hint?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const err = state.fieldErrors?.[name];
  return (
    <div className={className}>
      <label className="field-label" htmlFor={`f-${name}`}>
        {label}
      </label>
      <input id={`f-${name}`} name={name} className="input" aria-invalid={err ? true : undefined} {...rest} />
      {err ? <p className="field-error">{err}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function Textarea({
  label,
  name,
  state,
  hint,
  className = '',
  ...rest
}: { label: string; name: string; state: AdminFormState; hint?: string; className?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const err = state.fieldErrors?.[name];
  return (
    <div className={className}>
      <label className="field-label" htmlFor={`f-${name}`}>
        {label}
      </label>
      <textarea id={`f-${name}`} name={name} className="textarea" aria-invalid={err ? true : undefined} {...rest} />
      {err ? <p className="field-error">{err}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function Select({
  label,
  name,
  state,
  options,
  className = '',
  ...rest
}: { label: string; name: string; state: AdminFormState; options: { value: string; label: string }[]; className?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const err = state.fieldErrors?.[name];
  return (
    <div className={className}>
      <label className="field-label" htmlFor={`f-${name}`}>
        {label}
      </label>
      <select id={`f-${name}`} name={name} className="select" aria-invalid={err ? true : undefined} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {err ? <p className="field-error">{err}</p> : null}
    </div>
  );
}

export function Check({ label, name, defaultChecked, hint }: { label: string; name: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4.5 w-4.5 accent-[var(--color-sun-deep)]" />
      <span>
        <span className="font-medium">{label}</span>
        {hint ? <span className="block text-xs text-ink-3">{hint}</span> : null}
      </span>
    </label>
  );
}
