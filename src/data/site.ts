/**
 * Central company configuration. Edit values here — every component reads from this file.
 * Anything set to `null` is an intentional placeholder and renders as "to be confirmed".
 */
export const site = {
  name: 'NextWave Digital',
  shortName: 'NextWave',
  tagline: 'Technology designed to make everyday life better.',
  description:
    'NextWave Digital builds practical, private digital tools for everyday life — from personal budgeting to sleep, stress and habit tracking.',
  /** TODO: replace with the real contact address once it exists (e.g. hello@yourdomain.co.za). */
  contactEmail: null as string | null,
  /** Country the company operates from — shown in the footer. */
  location: 'South Africa',
  foundedYear: 2026,
} as const;

export const nav = [
  { label: 'Home', href: '/#home' },
  { label: 'About', href: '/#about' },
  { label: 'Products', href: '/#products' },
  { label: 'Vision', href: '/#vision' },
  { label: 'Contact', href: '/#contact' },
] as const;
