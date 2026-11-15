import {
  CalendarDays,
  Coffee,
  Disc3,
  Drama,
  Flame,
  Gift,
  MapPin,
  Mountain,
  Music,
  PartyPopper,
  ShoppingBasket,
  Sparkles,
  Sun,
  Ticket,
  Trees,
  Trophy,
  Users,
  Utensils,
  Waves,
  type LucideIcon,
} from 'lucide-react';

/** Category icons are stored by name in the database; this maps them to components. */
const ICONS: Record<string, LucideIcon> = {
  waves: Waves,
  utensils: Utensils,
  flame: Flame,
  coffee: Coffee,
  'shopping-basket': ShoppingBasket,
  'party-popper': PartyPopper,
  mountain: Mountain,
  trees: Trees,
  ticket: Ticket,
  music: Music,
  'disc-3': Disc3,
  drama: Drama,
  gift: Gift,
  sun: Sun,
  sparkles: Sparkles,
  users: Users,
  trophy: Trophy,
  calendar: CalendarDays,
  'map-pin': MapPin,
};

export const ICON_NAMES = Object.keys(ICONS);

export function CategoryIcon({ name, size = 18, className, strokeWidth = 1.8 }: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  const Cmp = ICONS[name] ?? MapPin;
  return <Cmp size={size} className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}
