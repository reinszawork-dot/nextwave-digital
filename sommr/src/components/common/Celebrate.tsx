'use client';

/** A brief burst of sun rays — shown when something is completed. */
export function Celebrate({ show, label }: { show: boolean; label?: string }) {
  if (!show) return null;
  const rays = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center" aria-hidden="true">
      <div className="relative h-0 w-0">
        {rays.map((deg, i) => (
          <span
            key={deg}
            className="absolute left-0 top-0 h-5 w-[3px] rounded-full"
            style={{
              background: i % 2 ? 'var(--color-sea)' : 'var(--color-sun)',
              ['--angle' as string]: `${deg}deg`,
              animation: `ray 900ms var(--ease-soft) ${i * 12}ms both`,
            }}
          />
        ))}
      </div>
      {label ? (
        <span className="pop-in absolute rounded-full bg-ink px-3 py-1 text-sm font-semibold text-cream shadow-[var(--shadow-float)]">
          {label}
        </span>
      ) : null}
    </div>
  );
}
