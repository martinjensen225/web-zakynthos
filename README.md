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
node scripts/create-seed.mjs | Set-Content -Encoding utf8 .\seed.local.sql
Get-Content .\seed.local.sql -TotalCount 1
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
node scripts/create-seed.mjs | Set-Content -Encoding utf8 .\seed.local.sql
Get-Content .\seed.local.sql -TotalCount 1
npx wrangler d1 execute zakynthos-trip --remote --file=seed.local.sql
```

The first line printed by `Get-Content` must start with `insert into trip_sections`. If it starts with `>` or npm package text, regenerate the file with the `node scripts/create-seed.mjs` command above. `seed.local.sql` is ignored by git. Delete it after setup if it contains trip details that should not remain on disk.

### 6. Create the Cloudflare Pages project

There is no Pages project to select until this step has been completed. Create the Pages project first, then return to the project settings to add bindings and production variables.

In the Cloudflare dashboard:

1. Open Workers & Pages.
2. Create an application.
3. Choose Pages.
4. Choose Connect to Git.
5. Connect the GitHub repository.
6. Select the `web-zakynthos` repository.
7. Configure the build:
   - Framework preset: None
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory / path: leave empty unless the repository is inside a monorepo
8. Save and deploy.

Cloudflare should detect the `functions/` directory automatically for a Pages project. If the dashboard does not show a Functions directory field, continue without setting one.

If the dashboard only shows fields such as Deploy command, Non-production branch deploy command, Path, API token, API token name, Variable name, and Variable value, the flow is not the classic Pages Git setup screen. Use this fallback configuration:

- Deploy command: `npm install && npm run build && npx wrangler pages deploy dist --project-name web-zakynthos`
- Non-production branch deploy command: `npm install && npm run build && npx wrangler pages deploy dist --project-name web-zakynthos --branch $CF_PAGES_BRANCH`
- Path: `.`
- API token name: `CLOUDFLARE_API_TOKEN`
- API token: a Cloudflare API token that can deploy Pages projects for the account

After the first deployment, open Workers & Pages and select the newly created `web-zakynthos` Pages project. Continue with the binding and environment variable steps below.

The API-token flow deploys with Wrangler. It still creates a Pages project, but the dashboard may not ask for a build output directory because the deploy command decides what folder is uploaded.

### 7. Add the D1 binding

`TRIP_DB` is not a normal environment variable. It is a D1 binding that gives the Pages Function access to the database through `context.env.TRIP_DB`.

In the Cloudflare dashboard:

1. Open Workers & Pages.
2. Select the `web-zakynthos` Pages project.
3. Open Settings.
4. Open Bindings.
5. Add a D1 database binding.
6. Set Variable name to `TRIP_DB`.
7. Select the `zakynthos-trip` database.
8. Save the binding.

Redeploy after adding or changing bindings.

### 8. Add environment variables

Environment variables are configured on the Pages project after the project exists.

In the Cloudflare dashboard:

1. Open Workers & Pages.
2. Select the `web-zakynthos` Pages project.
3. Open Settings.
4. Open Environment variables.
5. Add each variable below.

Add `SESSION_SECRET`:

- Variable name: `SESSION_SECRET`
- Variable value: a long random secret string from a password manager

Add `PUBLIC_READ`:

- Variable name: `PUBLIC_READ`
- Variable value: `false`

Use `PUBLIC_READ=false` when hotel details, booking references, emergency contacts, or other private trip data are stored in the app. Use `PUBLIC_READ=true` only when visitors may view the trip without logging in.

Add `EDITOR_USERS_JSON`:

- Variable name: `EDITOR_USERS_JSON`
- Variable value: the combined editor JSON array from the credential generation step

Example value:

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

The local `.dev.vars` file uses the same names for local development. Production values belong in the Cloudflare Pages dashboard, not in GitHub and not in `wrangler.toml`.

Redeploy after adding or changing environment variables.

### 9. Deploy and verify

Trigger a Cloudflare Pages deployment from the dashboard or by pushing to the connected GitHub branch.

After deployment:

1. Open the Cloudflare Pages URL.
2. Confirm the app asks for login when `PUBLIC_READ=false`.
3. Confirm the app is visible and shows an Editor login button when `PUBLIC_READ=true`.
4. Log in as each editor.
5. Toggle a favorite, add a note, and update a checklist item.
6. Refresh the page and open the site on another device to confirm the changes persist.

## Legacy Cloudflare Setup Notes

Older Cloudflare Pages setup screens may use slightly different labels:

- Build command: `npm run build`
- Build output directory: `dist`
- Functions directory: `functions`
- D1 binding: `TRIP_DB`

The current app only requires the `dist` build output, the `functions/` directory, the `TRIP_DB` D1 binding, and the three environment variables described above.

If the dashboard asks for variable name and variable value during project creation, those are environment variables. Add `SESSION_SECRET`, `PUBLIC_READ`, and `EDITOR_USERS_JSON` there. Add `TRIP_DB` later as a D1 binding after the Pages project exists.

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
node scripts/create-seed.mjs | Set-Content -Encoding utf8 .\seed.local.sql
Get-Content .\seed.local.sql -TotalCount 1
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
