@AGENTS.md

# SOMMR — notes for Claude

SOMMR is a South African summer lifestyle and discovery app (Next.js 16, React 19, Tailwind 4, PostgreSQL). Start with `README.md` for features, setup, deployment and what still needs API keys.

## Commands
- `npm run dev` — dev server on http://localhost:3000. Without `DATABASE_URL` it uses an embedded PGlite database in `.data/` (migrated and seeded automatically).
- `npm test` — Vitest unit + integration tests (37). `npm run typecheck`. `npm run build` — production build (runs `scripts/predeploy.ts` first; it only touches the database on Vercel production deploys or with `RUN_MIGRATIONS=true`).
- End-to-end smoke test against a running server: `BASE_URL=http://localhost:3000 node tests/e2e/smoke.mjs` (the server needs `ADMIN_EMAILS=e2e-admin@sommr.test`). Sign-ups are rate-limited to 8/hour per IP — clear the `auth_attempts` table between repeated runs.

## Where things are
- Pages: `src/app/(app)` (signed-in), `(auth)`, `(focus)/onboarding`, `(admin)/admin`; JSON routes in `src/app/api`.
- Server code (never imported by the browser): `src/server` — `db.ts` + `sql.ts` (tagged-template SQL, always parameterised), `auth.ts`, `env.ts` (all configuration), `services/`, `places/` (OpenStreetMap), `events/` (providers + importer), `actions/` (Server Actions).
- Shared logic: `src/lib` (South African time helpers in `time.ts` — always use these, never raw `Date` maths for days/weeks).
- Database schema: `migrations/*.sql` — add a new numbered file for changes; never edit an applied migration.
- Motion system: see the "Motion" section in `README.md` (`data-reveal`, `<WordReveal>`, `<Float>`, `data-tilt`, `data-magnetic`, `Segmented`, `useConfirm()`).

## Rules for this project
- **Never invent data.** No sample events, places or listings shown as real. Missing integrations get a clear empty state and a note in the README.
- Secrets stay server-side in `src/server/env.ts`; document new settings in `.env.example`.
- Keep the design language: warm cream/charcoal, muted orange and soft blue, rounded cards, Instrument Serif headings. Respect `prefers-reduced-motion`.
- Check accessibility (WCAG AA) and the phone layout for UI changes.
- Times are South African (SAST, UTC+2).

## Owner's notes
If the Obsidian "Claude Brain" vault is available (see the owner's user-level `CLAUDE.md`), read `Projects/SOMMR.md` there and add a log entry when you finish.
