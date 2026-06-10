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

## Manual Cloudflare Setup

This setup creates the shared production backend used by the deployed trip planner.

### 1. Sign in to Cloudflare

Run Wrangler from the repository root:

```powershell
npx wrangler login
```

Approve the browser login prompt for the Cloudflare account that will own the Pages project and D1 database.

### 2. Create the D1 database

```powershell
npx wrangler d1 create zakynthos-trip
```

Copy the `database_id` from the command output and update `wrangler.toml`:

```toml
database_id = "the-cloudflare-d1-database-id"
```

The D1 binding name must remain `TRIP_DB`; the Pages Function code expects that exact binding.

### 3. Generate editor credentials

Generate one password hash per editor. Use a different salt for each editor.

```powershell
npm run hash:editor -- martin "choose-a-password" "choose-a-random-salt"
npm run hash:editor -- girlfriend "choose-a-password" "choose-another-random-salt"
```

Combine the generated objects into one JSON array:

```json
[
  {
    "username": "martin",
    "displayName": "Martin",
    "salt": "choose-a-random-salt",
    "passwordHash": "generated-password-hash"
  },
  {
    "username": "girlfriend",
    "displayName": "Girlfriend",
    "salt": "choose-another-random-salt",
    "passwordHash": "generated-password-hash"
  }
]
```

Store only the JSON array in Cloudflare environment variables. Do not commit real passwords, salts, or generated hashes unless the password is temporary and will be replaced.

### 4. Apply the production database migration

```powershell
npx wrangler d1 migrations apply zakynthos-trip --remote
```

### 5. Seed the production database

Generate seed SQL from the current `content/*.json` files and execute it against the remote D1 database:

```powershell
npm run seed:sql > seed.local.sql
npx wrangler d1 execute zakynthos-trip --remote --file=seed.local.sql
```

`seed.local.sql` is ignored by git. Delete it after setup if it contains trip details that should not remain on disk.

### 6. Create the Cloudflare Pages project

In the Cloudflare dashboard:

1. Open Workers & Pages.
2. Create a Pages application.
3. Connect the GitHub repository.
4. Select the `web-zakynthos` repository.
5. Set the build command to `npm run build`.
6. Set the build output directory to `dist`.
7. Keep the Functions directory as `functions`.

### 7. Add the D1 binding

In the Cloudflare Pages project settings, add a D1 database binding:

- Variable name: `TRIP_DB`
- Database: `zakynthos-trip`

### 8. Add environment variables

Add these variables to the Cloudflare Pages project:

- `SESSION_SECRET`: long random string used to sign editor cookies.
- `EDITOR_USERS_JSON`: combined editor JSON array from the credential generation step.
- `PUBLIC_READ`: `false` for private read/write, or `true` for public read with protected editing.

Use `PUBLIC_READ=false` when hotel details, booking references, emergency contacts, or other private trip data are stored in the app.

### 9. Deploy and verify

Trigger a Cloudflare Pages deployment from the dashboard or by pushing to the connected GitHub branch.

After deployment:

1. Open the Cloudflare Pages URL.
2. Confirm the app asks for login when `PUBLIC_READ=false`.
3. Confirm the app is visible and shows an Editor login button when `PUBLIC_READ=true`.
4. Log in as each editor.
5. Toggle a favorite, add a note, and update a checklist item.
6. Refresh the page and open the site on another device to confirm the changes persist.

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
