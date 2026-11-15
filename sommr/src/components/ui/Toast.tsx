'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { SPRING } from '@/components/motion/MotionProvider';
import { CircleCheck, CircleAlert, X } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
  detail?: string;
}

const ToastCtx = createContext<(message: string, opts?: { tone?: Tone; detail?: string }) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (message: string, opts?: { tone?: Tone; detail?: string }) => {
      const id = nextId.current++;
      setItems((xs) => [...xs.slice(-2), { id, message, tone: opts?.tone ?? 'success', detail: opts?.detail }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );
  const value = useMemo(() => push, [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bottom-nav-h)+16px)] z-[80] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:left-[var(--sidebar-w)]"
        aria-live="polite"
        role="status"
      >
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <m.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: SPRING.snappy }}
              exit={{ opacity: 0, y: 10, scale: 0.97, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-ink px-4 py-3 text-cream shadow-[var(--shadow-float)]"
            >
              {t.tone === 'error' ? (
                <CircleAlert size={18} className="mt-0.5 shrink-0 text-[#f2a58b]" aria-hidden="true" />
              ) : (
                <m.span initial={{ scale: 0.4, rotate: -30 }} animate={{ scale: 1, rotate: 0, transition: { ...SPRING.snappy, delay: 0.08 } }} className="mt-0.5 shrink-0">
                  <CircleCheck size={18} className="text-[#f2b98b]" aria-hidden="true" />
                </m.span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t.message}</p>
                {t.detail ? <p className="mt-0.5 text-[0.8rem] text-cream/70">{t.detail}</p> : null}
              </div>
              <button onClick={() => dismiss(t.id)} className="-m-1 rounded-full p-1 text-cream/60 transition-colors hover:text-cream" aria-label="Dismiss">
                <X size={16} aria-hidden="true" />
              </button>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
