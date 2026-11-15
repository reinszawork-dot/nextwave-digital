/**
 * Gentle ambient float: the content drifts a few pixels while a soft shadow
 * beneath it breathes in time. Use sparingly — one or two per screen.
 */
export function Float({
  children,
  duration = 8,
  delay = 0,
  shadow = true,
  className = '',
}: {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  shadow?: boolean;
  className?: string;
}) {
  return (
    <div className={`float-wrap ${className}`} style={{ ['--float-dur' as string]: `${duration}s`, ['--float-delay' as string]: `${-delay}s` }}>
      {shadow ? <span className="float-shadow" aria-hidden="true" /> : null}
      <div className="float-body h-full">{children}</div>
    </div>
  );
}
