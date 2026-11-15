export function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`animate-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** A small sun gently rising — used for full-section loading states. */
export function SunLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-10 text-ink-3">
      <div className="relative h-8 w-12 overflow-hidden">
        <div
          className="absolute left-1/2 top-2 h-8 w-8 -translate-x-1/2 rounded-full bg-sun"
          style={{ animation: 'sun-rise 1.8s var(--ease-soft) infinite' }}
        />
        <div className="absolute inset-x-0 bottom-0 h-[2px] rounded bg-sea" />
      </div>
      <span className="text-sm">{label}…</span>
    </div>
  );
}
