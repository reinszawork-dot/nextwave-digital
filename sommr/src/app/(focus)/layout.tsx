import { Logo } from '@/components/ui/Logo';

export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center px-5 pt-6 sm:px-8">
        <Logo />
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-16 pt-10 sm:px-8">{children}</main>
    </div>
  );
}
