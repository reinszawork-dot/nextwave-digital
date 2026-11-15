import { CategoryIcon } from '@/components/ui/Icon';

export interface CategoryLite {
  slug: string;
  label: string;
  icon: string;
  color: string;
}

/** A soft, tinted circle with the category icon — used where there's no photo. */
export function CategoryGlyph({ category, size = 40 }: { category: CategoryLite | undefined; size?: number }) {
  const color = category?.color ?? '#7c756b';
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size, background: `color-mix(in srgb, ${color} 14%, white)`, color }}
      aria-hidden="true"
    >
      <CategoryIcon name={category?.icon ?? 'map-pin'} size={Math.round(size * 0.45)} />
    </span>
  );
}

export function CategoryPill({ category }: { category: CategoryLite | undefined }) {
  if (!category) return null;
  return (
    <span
      className="tag"
      style={{ background: `color-mix(in srgb, ${category.color} 12%, white)`, color: `color-mix(in srgb, ${category.color} 80%, black)` }}
    >
      <CategoryIcon name={category.icon} size={13} strokeWidth={2} />
      {category.label}
    </span>
  );
}
