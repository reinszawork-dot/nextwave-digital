import { SunLoader } from '@/components/ui/Spinner';

export default function Loading() {
  return (
    <div className="grid min-h-[60dvh] place-items-center">
      <SunLoader label="Getting things ready" />
    </div>
  );
}
