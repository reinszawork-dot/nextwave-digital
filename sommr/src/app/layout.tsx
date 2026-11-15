import type { Metadata, Viewport } from 'next';
import { Geist, Instrument_Serif } from 'next/font/google';
import { Suspense } from 'react';
import { MOTION_BOOT_SCRIPT, MotionEffects } from '@/components/motion/MotionEffects';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { NavProgress } from '@/components/motion/NavProgress';
import { ConfirmProvider } from '@/components/ui/Confirm';
import { ToastProvider } from '@/components/ui/Toast';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'SOMMR — Make this summer count', template: '%s · SOMMR' },
  description:
    'SOMMR helps South Africans make the most of summer: discover places and events, take on daily summer challenges and keep your best memories.',
  applicationName: 'SOMMR',
  appleWebApp: { capable: true, title: 'SOMMR', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#faf6ef',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The boot script adds data-motion before React hydrates, hence suppressHydrationWarning.
    <html lang="en-ZA" className={`${geist.variable} ${instrument.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <MotionProvider>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </MotionProvider>
        <MotionEffects />
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
      </body>
    </html>
  );
}
