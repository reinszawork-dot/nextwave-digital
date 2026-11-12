# NextWave Digital — company website

The official website of **NextWave Digital**, home of Wisely (budgeting), Lull (sleep & stress), Kindling (habits) and StudyHub (study).

Built with [Astro](https://astro.build) as a fully static site: no client framework, one small script, fast to load and easy for search engines to read. Icons are [Lucide](https://lucide.dev); charts are hand-built SVG components (no chart library).

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
| Colours, typography, spacing (design tokens) | `src/styles/global.css` (warm cream / charcoal theme, Newsreader + Geist fonts) |
| Page shell, SEO / Open Graph tags | `src/layouts/Base.astro` |
| Home page sections | `Hero`, `About`, `Products`, `Showcase`, `Numbers`, `Vision`, `Testimonials`, `Contact` in `src/components/` |
| Charts (line/area, bar with views, ring, counter) | `src/components/charts/*`, helpers in `src/lib/chart.ts` |
| Interactions (reveals, count-ups, chart hover, tabs, spotlight) | `src/scripts/site.ts` |
| **Real** figures on "By the numbers" | `src/data/stats.json`: regenerate with `node scripts/collect-stats.mjs` (measures the committed code of the sibling app folders) |
| **Sample** data for the illustrative dashboards | `src/data/showcase.ts` (always labelled "Sample data" on the site) |
| Testimonials (section stays hidden while empty) | `src/data/testimonials.ts`: add only real quotes, with permission |
| Product demo videos (shown on each product page) | `public/demos/<id>.{webm,mp4,jpg}`, lengths in `src/data/demos.json`, player in `src/components/DemoVideo.astro` |

### Re-recording the product demo videos

The clips are real screen recordings of the **live** apps, made by an automated phone-sized Chrome window. After an app changes:

```bash
cd tools/demo-recorder
npm install                      # once; uses your installed Chrome, no browser download
node record.mjs                  # all apps, or e.g. `node record.mjs lull kindling`
node record.mjs --encode-only    # re-encode existing recordings without re-recording
```

Each demo's steps live in `tools/demo-recorder/record.mjs`. If an app's buttons change, update that app's steps there. The tool is separate from the website and isn't installed or run by Vercel.
| Product cards & previews | `src/components/ProductCard.astro`, `ProductPreview.astro`, `previews/*` |
| Product detail pages | `src/pages/products/[slug].astro` → `/products/wisely`, `/products/lull`, `/products/kindling`, `/products/studyhub` |
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
