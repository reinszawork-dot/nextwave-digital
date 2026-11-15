'use client';

import { AnimatePresence, m } from 'motion/react';
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { SPRING } from '@/components/motion/MotionProvider';

interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmCtx = createContext<Confirm>(async (o) => window.confirm(o.title));

/** `const confirm = useConfirm(); if (await confirm({ title: 'Delete?' })) …` */
export function useConfirm() {
  return useContext(ConfirmCtx);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ options: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);
  const confirm = useCallback<Confirm>((options) => new Promise((resolve) => setState({ options, resolve })), []);
  const close = (result: boolean) => {
    state?.resolve(result);
    setState(null);
  };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <AnimatePresence>{state ? <Dialog key="confirm" options={state.options} onClose={close} /> : null}</AnimatePresence>
    </ConfirmCtx.Provider>
  );
}

function Dialog({ options, onClose }: { options: ConfirmOptions; onClose: (result: boolean) => void }) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const danger = options.tone !== 'default';
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const close = (v: boolean) => closeRef.current(v);
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Tab' && panel.current) {
        const items = [...panel.current.querySelectorAll<HTMLElement>('button')];
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, []);

  return (
    <m.div className="fixed inset-0 z-[90] flex items-end justify-center p-3 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.18 } }}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[3px]" onClick={() => onClose(false)} aria-hidden="true" />
      <m.div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        aria-describedby={options.body ? `${id}-b` : undefined}
        className="relative w-full max-w-[400px] rounded-[26px] border border-line bg-paper p-6 shadow-[var(--shadow-float)]"
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: SPRING.snappy }}
        exit={{ opacity: 0, y: 14, scale: 0.98, transition: { duration: 0.16 } }}
      >
        {danger ? (
          <m.span
            className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-danger-soft text-danger"
            initial={{ scale: 0.6, rotate: -12 }}
            animate={{ scale: 1, rotate: 0, transition: { ...SPRING.snappy, delay: 0.06 } }}
          >
            <AlertTriangle size={20} aria-hidden="true" />
          </m.span>
        ) : null}
        <h2 id={`${id}-t`} className="display text-[1.75rem] leading-tight">
          {options.title}
        </h2>
        {options.body ? (
          <p id={`${id}-b`} className="mt-2 text-sm leading-relaxed text-ink-3">
            {options.body}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" className="btn btn-ghost" onClick={() => onClose(false)}>
            {options.cancelLabel ?? 'Cancel'}
          </button>
          <button type="button" className={`btn ${danger ? 'bg-danger text-white hover:bg-[#9b3826]' : 'btn-primary'}`} onClick={() => onClose(true)}>
            {options.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </m.div>
    </m.div>
  );
}
