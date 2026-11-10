import { defineConfig } from 'astro/config';

// Set SITE_URL (e.g. https://nextwavedigital.co.za) once a domain is chosen.
// It enables canonical URLs, absolute Open Graph links and the sitemap.
const site = process.env.SITE_URL || undefined;

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
