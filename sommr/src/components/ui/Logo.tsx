export function SunMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path d="M7.5 18.5a8.5 8.5 0 0 1 17 0Z" fill="var(--color-sun)" />
      <path
        d="M4.5 22.6c1.9 0 1.9-1.3 3.8-1.3s1.9 1.3 3.8 1.3 1.9-1.3 3.8-1.3 1.9 1.3 3.8 1.3 1.9-1.3 3.8-1.3 1.9 1.3 3.8 1.3"
        stroke="var(--color-sea)"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M8.3 26.6c1.9 0 1.9-1.2 3.8-1.2s1.9 1.2 3.8 1.2 1.9-1.2 3.8-1.2 1.9 1.2 3.8 1.2"
        stroke="var(--color-sea)"
        strokeOpacity=".55"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <SunMark />
      <span className="text-[15px] font-semibold tracking-[0.22em] text-ink">SOMMR</span>
    </span>
  );
}
