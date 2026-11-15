import Image from 'next/image';
import { PHOTOS, type PhotoKey } from '@/lib/photos';

/** A bundled summer photo, optimised by next/image. */
export function Photo({
  name,
  className = '',
  sizes = '100vw',
  priority = false,
  alt,
}: {
  name: PhotoKey;
  className?: string;
  sizes?: string;
  priority?: boolean;
  alt?: string;
}) {
  const p = PHOTOS[name];
  return (
    <Image
      src={p.src}
      alt={alt ?? p.alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className}`}
    />
  );
}
