# NextWave Digital — company website

The official website of **NextWave Digital**, home of Wisely (budgeting), Lull (sleep & stress) and Kindling (habits).

Built with [Astro](https://astro.build) as a fully static site: no client framework, very little JavaScript, fast to load and easy for search engines to read.

## Run it locally

Requires Node.js 18.20+ (developed on Node 24).

```bash
npm install
npm run dev        # http://localhost:4321 — live reload while editing
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
```

## Where things live

| What | File |
| --- | --- |
| Company name, tagline, **contact email**, nav links | `src/data/site.ts` |
| Products, descriptions, features, **live app links** | `src/data/products.ts` |
| Colours, typography, spacing (design tokens) | `src/styles/global.css` |
| Page shell, SEO / Open Graph tags | `src/layouts/Base.astro` |
| Home page sections | `src/components/Hero.astro`, `About.astro`, `Products.astro`, `Vision.astro`, `Contact.astro` |
| Product cards & previews | `src/components/ProductCard.astro`, `ProductPreview.astro`, `previews/*` |
| Product detail pages | `src/pages/products/[slug].astro` → `/products/wisely`, `/products/lull`, `/products/kindling` |
| Logo / favicon | `src/components/Logo.astro`, `public/favicon.svg` |
| PNG icons + social share image | `node scripts/make-icons.mjs` regenerates `public/*.png` |

### Placeholders to fill in

- `site.contactEmail` in `src/data/site.ts`. While it is `null` the Contact section says "Contact email coming soon". Once you set it, a working `mailto:` button appears.
- `appUrl` for each product in `src/data/products.ts`. While it is `null` the product page shows "Link coming soon". Once you set it, an "Open app" button appears.
- `SITE_URL` environment variable: the public address of the site. It turns on canonical URLs, absolute Open Graph links and a full `sitemap.xml`.

## Publish to GitHub

1. Create an **empty** repository at <https://github.com/new>, for example `nextwave-digital`. Don't add a README or licence.
2. From this folder:

```bash
git remote add origin https://github.com/<your-username>/nextwave-digital.git
git push -u origin main
```

## Deploy on Vercel (free Hobby plan)

1. Sign in at <https://vercel.com> with your GitHub account. The Hobby plan is free and needs no card.
2. **Add New → Project**, then import the `nextwave-digital` repository.
3. Vercel detects **Astro** automatically. Keep the defaults: build command `npm run build`, output directory `dist`.
4. Optional: under **Environment Variables**, add `SITE_URL` = your final URL (e.g. `https://nextwave-digital.vercel.app`).
5. Click **Deploy**. Every later `git push` to `main` redeploys automatically, and pull requests get preview URLs.

A custom domain (e.g. `nextwavedigital.co.za`) can be attached later under **Project → Settings → Domains**. Domains are bought separately.
