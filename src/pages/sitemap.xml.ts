import type { APIRoute } from 'astro';
import { products } from '../data/products';

// Absolute URLs need SITE_URL; without it an empty (valid) sitemap is emitted.
export const GET: APIRoute = ({ site }) => {
  const paths = ['/', ...products.map((p) => `/products/${p.id}`)];
  const urls = site
    ? paths.map((p) => `  <url><loc>${new URL(p, site).href}</loc></url>`).join('\n')
    : '';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
