# Zakynthos Shared Trip Planner

Mobile-first shared trip planner and phone guide for a September trip to Zakynthos, Greece. The app keeps the original guide-style pages while storing trip content, notes, favorites, and checklist progress in protected Cloudflare D1 storage.

## Tech Stack

- Static HTML, CSS, and browser JavaScript
- Cloudflare Pages for hosting
- Cloudflare Pages Functions for `/api/*`
- Cloudflare D1 for shared persistence
- Signed HttpOnly editor sessions
- Google Maps search links with no Maps API key

## Local Development

```powershell
npm install
npm run lint
npm run test
npm run build
npm run preview
```

`npm run preview` serves the static build only. It does not run the API. Use Cloudflare Wrangler for full local API testing.

## Local Backend Setup

1. Install or run Wrangler with the Cloudflare CLI tooling.
2. Copy `.dev.vars.example` to `.dev.vars`.
3. Generate an editor password hash:

```powershell
npm run hash:editor -- martin "replace-with-password" "replace-with-random-salt"
```

4. Put the generated JSON into `EDITOR_USERS_JSON` in `.dev.vars`.
5. Create and migrate a local D1 database:

```powershell
npx wrangler d1 migrations apply zakynthos-trip --local
```

6. Seed the database from the current `content/*.json` files:

```powershell
npm run seed:sql > seed.local.sql
npx wrangler d1 execute zakynthos-trip --local --file=seed.local.sql
```

7. Build and run the Pages app locally:

```powershell
npm run build
npx wrangler pages dev dist --d1 TRIP_DB=zakynthos-trip
```

## Data Model

- `trip_sections`: JSON sections for `meta`, `highlights`, `quickLinks`, `flights`, `stay`, `locations`, `itinerary`, `attractions`, `restaurants`, `planning`, and `duringTrip`.
- `notes`: shared notes attached to page/card targets.
- `favorites`: shared saved targets used by attraction, restaurant, map, stay, itinerary, and guide pages.
- `checklist_items`: shared planning checklist items and completion state.

The original `content/*.json` files are seed data. Runtime edits are saved in D1 and are not written back to source files.

## API

- `GET /api/session`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/trip`
- `PATCH /api/trip/sections/:sectionKey`
- `POST /api/notes`, `PUT /api/notes/:id`, `DELETE /api/notes/:id`
- `PUT /api/favorites/:targetId`, `DELETE /api/favorites/:targetId`
- `POST /api/checklist-items`, `PUT /api/checklist-items/:id`, `DELETE /api/checklist-items/:id`

Write operations require an editor session. By default, reads are private too. Set `PUBLIC_READ=true` only when the trip guide should be visible to visitors without login.

## Deployment

Use Cloudflare Pages connected to the GitHub repository.

- Build command: `npm run build`
- Build output directory: `dist`
- Functions directory: `functions`
- D1 binding: `TRIP_DB`

Create production resources:

```powershell
npx wrangler d1 create zakynthos-trip
npx wrangler d1 migrations apply zakynthos-trip --remote
npm run seed:sql > seed.local.sql
npx wrangler d1 execute zakynthos-trip --remote --file=seed.local.sql
```

Update `wrangler.toml` with the D1 database id returned by Cloudflare.

Set these Cloudflare Pages environment variables/secrets:

- `SESSION_SECRET`: long random string used to sign editor cookies.
- `EDITOR_USERS_JSON`: JSON array generated with `npm run hash:editor`.
- `PUBLIC_READ`: `false` for private read/write or `true` for public read and protected write.

## Editor Access

Editor users are configured through `EDITOR_USERS_JSON`; no passwords are committed to source control. Add both travelers to that JSON array when both should be able to edit the trip.

## Cost Notes

Cloudflare Pages, Pages Functions, and D1 have free-tier quotas suitable for a small two-person trip planner. No paid third-party APIs are required.

## Known Limitations

- The app uses normal save/refresh behavior, not real-time collaborative editing.
- Section editors use JSON for broad trip content changes.
- Draft section edits are kept in browser `localStorage` until saved or reset.
- Real booking details, private addresses, flight numbers, and emergency contacts should be entered through the protected app, not committed into seed JSON.
