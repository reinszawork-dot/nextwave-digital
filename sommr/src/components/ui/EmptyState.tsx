import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'px-4 py-8' : 'px-6 py-14'}`}>
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-sun-soft text-sun-deep">
        <Icon size={24} strokeWidth={1.7} aria-hidden="true" />
      </div>
      <h3 className="display text-2xl">{title}</h3>
      {children ? <div className="mt-2 max-w-sm text-[0.95rem] leading-relaxed text-ink-3">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
