import { Camera, Compass, Flame, List, Map, Sparkles, Star, Sun, Trophy, Waves } from 'lucide-react';
import type { AchievementDef } from '@/lib/achievements';
import { formatDateWithYear } from '@/lib/time';

const ICONS = { sun: Sun, flame: Flame, trophy: Trophy, camera: Camera, map: Map, waves: Waves, list: List, star: Star, compass: Compass, sparkles: Sparkles };

export function Badge({ a, earnedAt, progress, index = 0 }: { a: AchievementDef; earnedAt?: Date; progress: number; index?: number }) {
  const Icon = ICONS[a.icon];
  const earned = !!earnedAt;
  const pct = Math.min(1, progress / a.target);
  return (
    <li data-reveal="" style={{ ['--i' as string]: index % 4 }}>
      <div className={`group card flex h-full flex-col items-center p-5 text-center ${earned ? 'card-hover' : 'bg-transparent shadow-none'}`}>
      <span
        className={`grid h-16 w-16 place-items-center rounded-full transition-[rotate,scale] duration-500 ease-[var(--ease-spring)] ${earned ? 'text-white group-hover:-rotate-12 group-hover:scale-110' : 'border border-dashed border-line-strong text-ink-3'}`}
        style={earned ? { background: 'radial-gradient(circle at 30% 30%, #f0a06b, #a44e27)' } : undefined}
        aria-hidden="true"
      >
        <Icon size={26} strokeWidth={1.8} />
      </span>
      <p className={`mt-3 font-semibold ${earned ? '' : 'text-ink-2'}`}>{a.title}</p>
      <p className="mt-1 text-xs leading-snug text-ink-3">{a.description}</p>
      {earned ? (
        <p className="mt-3 text-xs font-medium text-leaf">Earned {formatDateWithYear(earnedAt)}</p>
      ) : (
        <div className="mt-3 w-full">
          <div className="h-1 overflow-hidden rounded-full bg-sand-2" role="progressbar" aria-valuemin={0} aria-valuemax={a.target} aria-valuenow={Math.min(progress, a.target)} aria-label={`${a.title} progress`}>
            <div className="h-full rounded-full bg-sun" style={{ width: `${pct * 100}%` }} />
          </div>
          <p className="mt-1.5 text-[0.7rem] text-ink-3">
            {Math.min(progress, a.target)} / {a.target}
          </p>
        </div>
      )}
      </div>
    </li>
  );
}
