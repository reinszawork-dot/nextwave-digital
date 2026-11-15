import { CircleAlert, CircleCheck } from 'lucide-react';
import type { FormState } from '@/app/(auth)/actions';

export function FormAlert({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <div role="alert" className="flex items-start gap-2.5 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
        <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{state.error}</span>
      </div>
    );
  }
  if (state.ok && state.message) {
    return (
      <div role="status" className="flex items-start gap-2.5 rounded-2xl bg-leaf-soft px-4 py-3 text-sm text-[#436b39]">
        <CircleCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{state.message}</span>
      </div>
    );
  }
  return null;
}
