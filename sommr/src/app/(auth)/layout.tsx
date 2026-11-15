import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Photo } from '@/components/ui/Photo';
import { getCurrentUser } from '@/server/auth';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect(user.onboarded ? '/' : '/onboarding');
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden lg:block">
        <Photo name="camps-bay" priority sizes="50vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-cream">
          <p className="eyebrow !text-cream/80">Camps Bay, Cape Town</p>
          <p className="display mt-3 max-w-md text-5xl">
            Long days, warm nights and a summer worth <em>remembering</em>.
          </p>
        </div>
      </div>
      <main className="flex flex-col px-5 pb-10 pt-6 sm:px-10">
        <Link href="/" className="w-fit" aria-label="SOMMR home">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10 page-enter">{children}</div>
      </main>
    </div>
  );
}
