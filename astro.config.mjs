import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Set SITE_URL (e.g. https://nextwavedigital.co.za) once a domain is chosen.
// It enables canonical URLs, absolute Open Graph links and the sitemap.
const site = process.env.SITE_URL || undefined;

export default defineConfig({
  site,
  output: 'static',
  // React is only used for the 3D hero island (Studio look); every other page part stays plain Astro.
  integrations: [react()],
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
