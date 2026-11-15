# SOMMR — Make this summer count ☀️

SOMMR is a South African summer lifestyle and discovery app. It helps people find beaches, braai spots, markets and what's on near them, take on a small summer challenge every day, keep a bucket list and save their best summer memories.

It's a complete web app: accounts, a real database, an interactive map with real places, automatic event imports, daily challenges, photo memories and an admin dashboard. It works on phones (bottom navigation) and desktops (sidebar).

---

## What's inside

| Section | What it does |
| --- | --- |
| **Home** | Personal greeting, live weather and tonight's sunset for your location, summer countdown (1 December → end of February), today's and this week's challenge, points and streak, bucket-list progress, events in the next three weeks, places around you and ideas matched to your interests. |
| **Explore** | Interactive map of real places across South Africa: beaches, restaurants, braai spots, coffee shops, markets, festivals, scenic spots, outdoors and entertainment. Search any town or suburb, filter by category, "near me", tap a place for hours, website, phone, **directions** (Google Maps, Waze, Apple Maps), save it, mark it visited, or add it to your bucket list. |
| **What's On?** | Events for Johannesburg, Cape Town, Pretoria and Durban (and anywhere near a listed town), filtered by city, date, type, price and distance, as a list or a map. Event pages have tickets, add-to-calendar (.ics), share, directions and a "listed by … checked … ago" source line. |
| **Challenges** | A daily and a weekly challenge picked for your city (no beach challenges inland), the month and your interests — mostly free. Swap up to twice. Points, streaks, 16 badges and a history. |
| **My Summer** | A timeline of memories (photos + notes), completed challenges, visited places and ticked-off bucket-list items; the bucket list with a sun-arc progress visual and suggestions; and everything you've saved. |
| **Profile** | Name, city or shared location, interests, password, sign out, delete account. |
| **Admin** | Overview and configuration health, event sources and import history, events (create, correct, feature, hide), places, challenges, categories (including the OpenStreetMap tags each map category imports), featured picks, member submissions (approve/reject) and users. |

### Honest data, by design

- **Places** come from **OpenStreetMap** (free, open data — © OpenStreetMap contributors) via the Overpass API, cached per map area for 14 days. Nothing is invented; places without a name are skipped.
- **Events** come only from configured sources — **Ticketmaster**, **Quicket**, **iCalendar feeds**, **web pages with schema.org event data** — or from admins and approved member suggestions. There is no sample or placeholder event data anywhere.
- **Finished events are never shown as current**: every query filters by end time (or start + 6 hours), and the daily import also archives them. Events removed from a complete feed are archived; cancellations are flagged.
- **Admin corrections stick**: if an admin edits an imported event or place, those fields are locked against future imports.
- Member suggestions are **hidden until an admin approves them**.

---

## Status: what works now, and what needs credentials

Everything below was built and tested (see *Testing*). Some parts need accounts or keys that only you can create:

| Feature | Status |
| --- | --- |
| Accounts, onboarding, dashboard, challenges, bucket list, memories, profile, admin | ✅ Works with any PostgreSQL database |
| Map tiles | ✅ OpenFreeMap — free, no key |
| Places | ✅ OpenStreetMap via Overpass — free, no key. Tested here on real Cape Town data (via the Nominatim fallback, because this build environment couldn't reach Overpass) |
| Location search & venue geocoding | ✅ OpenStreetMap Nominatim — free, no key, rate-limited to 1 request/second |
| Weather | ✅ Open-Meteo — free, no key. *Free tier is for non-commercial use; a commercial launch needs their paid plan.* |
| **Ticketmaster events** | 🔑 Needs `TICKETMASTER_API_KEY` (free). The importer is built and was tested against the live API (it correctly reports a rejected key). Ticketmaster's Discovery API has **limited South African coverage**, so expect few events from it. |
| **Quicket events** | 🔑 Needs `QUICKET_API_KEY` from [developer.quicket.co.za](https://developer.quicket.co.za). Mapped to Quicket's documented `GET /api/events` format and tested against the live endpoint without a key (401). Field mapping should be checked against real responses once you have a key. |
| iCal / schema.org sources | ✅ Add any trusted feed or page URL in **Admin → Imports** (no key) |
| Daily automatic imports | 🔑 Needs `CRON_SECRET` on Vercel (see `vercel.json`) |
| Password-reset emails | 🔑 Needs `RESEND_API_KEY`. Without it, development prints the link to the server log; production tells the user email isn't set up |
| Photo storage | ✅ In Postgres by default; optional private Supabase Storage bucket |

> **Getting events on day one:** other South African ticketing sites (Computicket, Howler, Webtickets) don't offer open public APIs. Ask venues and organisers for iCal feeds, add event pages that publish schema.org data in **Admin → Imports**, or use **Admin → Events → Add event → Import details from an event page** to pre-fill a form from a single listing.

---

## Run it locally

Requires **Node.js 20.9+**.

```bash
cd sommr
npm install
cp .env.example .env.local     # optional for local development
npm run dev                    # http://localhost:3000
```

With no `DATABASE_URL`, development uses an embedded PostgreSQL (**PGlite**) stored in `sommr/.data/` — migrations and seed data are applied automatically. To make yourself an admin, set `ADMIN_EMAILS=you@example.com` before signing up, or run `npm run make-admin -- you@example.com`.

To use a real PostgreSQL locally instead, set `DATABASE_URL` and run `npm run db:setup`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm test` | Unit + integration tests (Vitest, uses a temporary embedded database) |
| `npm run typecheck` | TypeScript check |
| `npm run db:setup` | Apply migrations and seed categories, challenges and event sources (safe to re-run) |
| `npm run import:events` | Run every enabled event source now |
| `npm run make-admin -- email` | Give an existing account admin access |

---

## Deploy (Supabase + Vercel, both have free tiers)

1. **Database — Supabase.** Create a project at [supabase.com](https://supabase.com). In *Project Settings → Database*, copy the **Transaction pooler** connection string (port 6543) and put your database password in it.
2. **Create the tables** from your computer, once:
   ```bash
   cd sommr
   DATABASE_URL="postgres://…pooler.supabase.com:6543/postgres" npm run db:setup
   ```
   Run `npm run db:migrate` again whenever a new file appears in `migrations/`.
3. **App — Vercel.** *Add New → Project*, import this repository and set **Root Directory** to `sommr`. Vercel detects Next.js.
4. **Environment variables** (Vercel → Settings → Environment Variables): at least `DATABASE_URL`, `APP_URL` (your Vercel URL), `ADMIN_EMAILS` and `CRON_SECRET`; then the optional keys from `.env.example`.
5. **Deploy.** The daily import runs at 03:17 UTC (05:17 SAST) via Vercel Cron — on the free Hobby plan crons run once a day. Admins can run imports any time from **Admin → Imports**.
6. Sign up with an email from `ADMIN_EMAILS` and open **Admin** to check the *Configuration* panel.

Photos can stay in the database (simplest). To use Supabase Storage instead, create a **private** bucket named `sommr-media`, then set `STORAGE_DRIVER=supabase`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

---

## How it's built

- **Next.js 16** (App Router, React 19, Server Components and Server Actions) with **TypeScript** and **Tailwind CSS 4**; **Framer Motion** (`motion`) for layout animations.
- **PostgreSQL** through `pg`, with a tiny injection-safe SQL builder (`src/server/sql.ts`) and plain SQL migrations (`migrations/`). PGlite for zero-setup development and tests.
- **MapLibre GL** with **OpenFreeMap** vector tiles, restyled to SOMMR's cream and soft-blue palette.
- **Fonts:** Instrument Serif (display) and Geist (text), self-hosted via `next/font`.
- **Photography:** curated, verified photos from Unsplash under the Unsplash License, bundled in `public/photos` (see `src/lib/photos.ts`). Photos of Camps Bay, Cape Town, Johannesburg and Blyde River Canyon are labelled with their real locations; the rest are used as generic summer imagery.

### Motion

Motion follows one vocabulary (tokens in `src/app/globals.css`): entrances ease out, ambient motion eases in-out, interactive returns use a gentle spring, and only `transform`/`opacity`/`filter` animate. Everything respects *prefers-reduced-motion*.

| Effect | How to use it |
| --- | --- |
| Page transitions | Automatic via React `<ViewTransition>` in `Page` (`src/components/shell/AppShell.tsx`). Add `transitionTypes={['nav-forward']}` / `['nav-back']` to links into and out of detail pages. Shared elements morph with `<ViewTransition name=… share="morph">`. |
| Navigation feedback | `NavProgress` (slim top bar) — the current page stays visible while the next one loads. |
| Scroll reveals | Add `data-reveal` (or `="fade"`, `"scale"`, `"image"`) and stagger with `style={{ '--i': n }}`. Handled by one IntersectionObserver in `MotionEffects`. Put it on a wrapper, not on an element that also lifts on hover. |
| Headlines | `<WordReveal>` (word-by-word, on load) or `<WordReveal trigger="scroll">`. |
| Floating | `<Float>` — gentle drift with a breathing shadow. Use one or two per screen. |
| Hover | `data-tilt` (+ `data-tilt-glare`) for photo cards, `data-magnetic` for primary buttons, `icon-wiggle` / `icon-spin` / `icon-nudge` on icons inside a `.group`. Fine pointers only. |
| Layout & presence | Framer Motion (`motion`, lazily loaded `m` components) for sliding indicators (`Segmented`, navigation), toasts, the confirm dialog (`useConfirm()`), dropdowns and the bucket list. |

### Security and privacy

- Passwords hashed with **scrypt** (N=2¹⁵); sessions are random tokens stored only as SHA-256 hashes, in `httpOnly`, `SameSite=Lax`, `Secure` (in production) cookies.
- Rate limiting on sign-in, sign-up, password resets, submissions and third-party API proxies (database-backed, works across serverless instances).
- Server Actions get Next.js's built-in origin checks; every page, action and API route verifies the session on the server (`src/proxy.ts` only adds a fast redirect).
- All API keys and secrets are server-only (`src/server/env.ts`); the browser never sees them.
- Admin-supplied URLs are fetched through an SSRF guard (public addresses only, limited redirects, size and time limits).
- Strict security headers and a Content-Security-Policy (`next.config.ts`).
- Uploaded photos are re-encoded on the server, which **removes EXIF data including GPS location**; photos are only ever served to their owner. Shared device locations are stored rounded to ~100 m. Account deletion removes everything.

### Project map

```
sommr/
  migrations/                 SQL schema
  scripts/                    migrate, seed, make-admin, import-events, copy-vendor
  src/app/(auth)/             sign in, sign up, password reset
  src/app/(focus)/onboarding  city + interests
  src/app/(app)/              home, explore, whats-on, challenges, my-summer, profile, places, events, submit
  src/app/(admin)/admin/      admin dashboard
  src/app/api/                places, geocode, media, calendar files, cron import
  src/components/             UI by feature (ui/, shell/, home/, explore/, events/, challenges/, summer/, admin/ …)
  src/lib/                    shared logic: time (SAST), season, sun times, cities, interests, achievements, photos
  src/server/                 database, auth, env, services, places (OSM), events (providers + importer), actions
  tests/                      Vitest unit/integration tests and an end-to-end smoke test
```

### Adding things

- **A new map category:** *Admin → Categories → Add a category*, with OpenStreetMap tag filters such as `amenity=ice_cream` or `leisure=swimming_pool|water_park`.
- **A new challenge:** *Admin → Challenges → Add challenge* (choose interests, cost, coastal-only and months).
- **A new event provider:** add a module in `src/server/events/providers/` that returns `ImportedEvent[]`, then add its `kind` to `fetchSource()` in `src/server/events/importer.ts` and to the `event_sources.kind` check in a new migration.

---

## Testing

```bash
npm test                         # 37 unit + integration tests
npm run build                    # production build with type checking
# End-to-end smoke test against a running server (production build recommended):
ADMIN_EMAILS=e2e-admin@sommr.test npm start &
BASE_URL=http://localhost:3000 node tests/e2e/smoke.mjs
```

The smoke test (16 checks) signs up real accounts, completes and swaps challenges, manages a bucket list, uploads a photo and confirms another user can't see it, loads the map, creates and approves events as an admin, checks members can't reach admin, verifies the phone layout has no sideways scroll and deletes an account. It creates clearly labelled `TEST` data, so run it against a development or staging database. Sign-ups are rate-limited to 8 per hour per IP; clear the `auth_attempts` table between repeated runs.

---

## Known limitations

- Ticketmaster's Discovery API has little South African inventory; Quicket and venue feeds will matter more.
- Recurring iCal events (`RRULE`) import only their first date.
- OpenStreetMap coverage varies by town; admins can add missing places, and fixing them on OpenStreetMap helps everyone.
- The public Overpass and Nominatim services are free community resources with fair-use limits. For heavy traffic, point `OVERPASS_URLS` / `NOMINATIM_URL` at a paid or self-hosted instance.
- English only for now.
