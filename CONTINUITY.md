# CONTINUITY

## Snapshot (≤ 25 lines)
- Goal: Convert the Zakynthos guide into a shared editable trip-planning web app. (2026-06-10) [USER]
- Now: Multi-trip portfolio/workspace implementation is staged: `/index.html` lists trips, `/trip.html?trip=:tripId` opens Cockpit, workspace links preserve `trip`, and trip CRUD is available to signed-in editors. (2026-06-16) [CODE]
- Next: Run npm validation after Node/npm are available on PATH, apply updated seed data to D1 after review, configure Cloudflare runtime secrets/bindings if not already done, then push `main` to deploy Pages automatically. (2026-06-16) [CODE]
- Open Questions: Cloudflare account/project secret values, editor users, and public-read setting are UNCONFIRMED. (2026-06-11) [USER]

## Decisions
- D001 SUPERSEDED by D003: Use Astro with TypeScript data and static output for a backend-free mobile trip guide. (2026-06-09) [CODE] Superseded because npm registry access was unavailable in the sandbox.
- D002 SUPERSEDED by D005: Use GitHub Pages as the first deployment target. (2026-06-09) [CODE] Superseded because shared persistence requires server-side API functions.
- D003 SUPERSEDED by D004: Use dependency-free static HTML/CSS/JS with editable `data/trip.js`. (2026-06-09) [CODE] Superseded because content editing moved into topic JSON files.
- D004 ACTIVE: Split editable trip content into topic-specific JSON files under `content/` and keep `data/trip.js` as a loader. (2026-06-10) [CODE] Reduces editing friction and keeps the browser app simple.
- D005 ACTIVE: Use Cloudflare Pages Functions with D1 and signed editor sessions for shared persistence. (2026-06-10) [CODE] Keeps the existing static frontend while adding protected server-side storage without frontend database credentials.
- D006 ACTIVE: Deploy the existing Cloudflare Pages Direct Upload project from GitHub Actions with `wrangler pages deploy`. (2026-06-10) [CODE] Avoids creating a Worker or recreating the Pages project while still deploying automatically from `main`.

## Done (recent) (≤ 7)
- 2026-06-10 [CODE] Replaced GitHub Pages deployment workflow with build validation because GitHub Pages cannot run the API.
- 2026-06-10 [CODE] Added and clarified step-by-step Cloudflare setup docs, including runtime vs build variables, D1 binding, deploy command guidance, API token permissions, troubleshooting, and Wrangler-compatible seed SQL generation.
- 2026-06-10 [CODE] Rewrote Cloudflare deployment docs as a fresh terminal-first Pages + Pages Functions + D1 guide using `web-zakynthos`, with editor credentials stored as encrypted Pages secrets and `PUBLIC_READ` stored in `wrangler.toml`.
- 2026-06-10 [CODE] Added a GitHub Actions deploy job that builds `dist/` and deploys the existing Pages project with `cloudflare/wrangler-action@v3`.
- 2026-06-10 [CODE] Documented push-based Pages deployment, required GitHub secrets, Pages-only verification, and why the workflow does not create a Worker.
- 2026-06-11 [CODE] Replaced raw JSON-first editing with structured add/update/remove controls, refreshed dashboard styling, tightened section/full-trip validation, and documented website editing.
- 2026-06-11 [CODE] Replaced under-page editor panels with inline editing on the visible cards, including add/delete/move/drag controls and optional image fields.
- 2026-06-11 [CODE] Refined edit mode so cards keep their normal layout while editing, itinerary time blocks remain side-by-side, places use clickable chips, and quick links use page choices instead of paths.
- 2026-06-11 [CODE] Reworked the app toward the TripTogether MVP with Cockpit/Plan/Map/More navigation, structured itinerary items, decisions, document records, packing, tasks, travel wallet, and mobile-first styling.
- 2026-06-11 [CODE] Removed the Budget tab/page and the related expense model from the TripTogether shell, leaving Cockpit/Plan/Map/More as the primary navigation.

## Working set (≤ 12 paths)
- README.md
- CONTINUITY.md
- package.json
- .github/workflows/build.yml
- data/trip.js
- content/
- functions/
- migrations/
- assets/app.js
- assets/styles.css
- more.html
- scripts/
- wrangler.toml

## Receipts (last 10–20)
- 2026-06-10T10:55+02:00 [TOOL] `npm run lint` passed after README manual setup guide update.
- 2026-06-10T12:24+02:00 [TOOL] `npm run lint` passed after README Cloudflare setup clarification.
- 2026-06-10T12:34+02:00 [TOOL] Earlier direct seed SQL generation produced `begin transaction;` as the first line, which Wrangler D1 rejected.
- 2026-06-10T12:38+02:00 [TOOL] `npm run lint`, `npm run test`, and `git diff --check` passed after removing seed SQL transaction statements.
- 2026-06-10T12:54+02:00 [TOOL] `npm run lint` passed after adding Cloudflare deploy command/API token troubleshooting docs.
- 2026-06-10T13:01+02:00 [TOOL] `npm run lint` passed after adding runtime/build variable placement guide to README.
- 2026-06-10T13:57+02:00 [CODE] Replaced duplicate Cloudflare README setup/deployment sections with one terminal-first Pages deployment guide; no Cloudflare deploy/API write commands were run.
- 2026-06-10T13:57+02:00 [TOOL] `npm run lint` and `git diff --check` passed after README deployment rewrite; diff check only reported CRLF normalization warnings.
- 2026-06-10T15:01+02:00 [CODE] Corrected Pages project name back to `web-zakynthos`; added `PUBLIC_READ` to `wrangler.toml`, removed it from `.dev.vars.example`, and added lint guards against committing `SESSION_SECRET` or `EDITOR_USERS_JSON`.
- 2026-06-10T15:01+02:00 [TOOL] `npm run lint`, `npm run test`, and `git diff --check` passed; diff check only reported CRLF normalization warnings.
- 2026-06-10T15:07+02:00 [CODE] Removed alternate Pages project-name guidance; README now documents one Pages-only deployment path for project `web-zakynthos`.
- 2026-06-10T15:07+02:00 [TOOL] `npm run lint`, `npm run test`, and `git diff --check` passed; diff check only reported CRLF normalization warnings.
- 2026-06-10T15:07+02:00 [TOOL] README/continuity scan confirmed no alternate Pages project-name guidance remains.
- 2026-06-10T15:45+02:00 [TOOL] `npm run lint`, `npm run test`, and `npm run build` passed after adding GitHub Actions Pages deployment.
- 2026-06-10T15:45+02:00 [TOOL] Workflow command scan confirmed `.github/workflows/build.yml` uses `pages deploy dist --project-name web-zakynthos --branch main`.
- 2026-06-10T15:45+02:00 [TOOL] Offline workflow YAML parser was unavailable locally (`ruby`, PyYAML, `powershell-yaml`, and `actionlint` missing).
- 2026-06-11T08:59+02:00 [TOOL] `npm run lint`, `npm run test`, `npm run build`, and `git diff --check` passed after structured editing update; diff check only reported CRLF normalization warnings.
- 2026-06-11T09:16+02:00 [TOOL] `npm run lint`, `node --check assets/app.js`, `npm run test`, `npm run build`, and `git diff --check` passed after inline card editing update; diff check only reported CRLF normalization warnings.
- 2026-06-11T09:55+02:00 [TOOL] `npm run lint`, `node --check assets/app.js`, `npm run test`, `npm run build`, and `git diff --check` passed after same-card editing and clickable mapping update; diff check only reported CRLF normalization warnings.
- 2026-06-11T10:45+02:00 [TOOL] `npm run lint`, `node --check assets/app.js`, `node --check functions/_lib/validation.js`, `npm run test`, `npm run build`, `git diff --check`, and `npm run seed:sql > $null` passed after TripTogether redesign; Wrangler was not installed locally for Pages Functions runtime verification.
- 2026-06-16T11:05+02:00 [CODE] Added multi-trip content layout, trip-aware API routes, selected-trip navigation, portfolio trip CRUD, and trip-scoped drafts/notes/favorites/checklist writes.
- 2026-06-16T11:05+02:00 [TOOL] `npm install`, `npm run lint`, `npm run test`, `npm run build`, and `node --check ...` could not start because `npm`/`node` were not on PATH; `git diff --check` passed with CRLF normalization warnings only.
