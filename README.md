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

## Cloudflare Pages Deployment

This application is a Cloudflare Pages project with Pages Functions and D1. Deploy it with `wrangler pages ...` commands. Do not deploy it with `wrangler deploy`, which is for Workers.

The canonical resource names are:

| Resource | Name |
| --- | --- |
| Pages project | `web-zakynthos` |
| D1 database | `zakynthos-trip` |
| D1 binding | `TRIP_DB` |
| Build output directory | `dist` |
| Functions directory | `functions` |

The fresh setup uses `web-zakynthos` for the Pages project so the default Pages URL is `web-zakynthos.pages.dev`.

### Source documents

This deployment guide follows the current Cloudflare documentation for:

- [Pages Direct Upload and Wrangler deploys](https://developers.cloudflare.com/pages/get-started/direct-upload/)
- [Pages Functions bindings, environment variables, and secrets](https://developers.cloudflare.com/pages/functions/bindings/)
- [D1 Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/)
- [Cloudflare API token permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)

### Runtime, binding, and deploy values

Cloudflare separates values used by the running Pages Function from values used by build/deploy automation.

| Name | Type | Where it belongs | Notes |
| --- | --- | --- | --- |
| `SESSION_SECRET` | Runtime secret | Pages project > Settings > Variables and Secrets > encrypted secret | Signs editor login cookies. |
| `EDITOR_USERS_JSON` | Runtime secret | Pages project > Settings > Variables and Secrets > encrypted secret | JSON array of editor users and password hashes. |
| `PUBLIC_READ` | Runtime variable | `[vars]` in `wrangler.toml` | Use `false` for a private trip guide. |
| `TRIP_DB` | D1 binding | Pages project > Settings > Bindings | Must point to the `zakynthos-trip` D1 database. |
| `CLOUDFLARE_API_TOKEN` | Deploy-only value | Local shell, CI secret, or a dashboard deploy-command setup | Only needed by automation that runs Wrangler. |
| `CLOUDFLARE_ACCOUNT_ID` | Deploy-only value | Local shell, CI secret, or a dashboard deploy-command setup | Only set when a deploy flow asks for it. |

Do not put `TRIP_DB` in the environment-variable section. It is a binding, and the API code reads it from `context.env.TRIP_DB`.

Do not put `SESSION_SECRET` or `EDITOR_USERS_JSON` in `wrangler.toml`. Secrets are encrypted Pages bindings and are also read from `context.env`, but they must be created as encrypted secrets so usernames, salts, and password verifiers are not committed to source control.

### 1. Sign in to Cloudflare

Run these commands from the repository root:

```powershell
npx wrangler login
npx wrangler whoami
```

### 2. Create the D1 database

Create the remote D1 database only once:

```powershell
npx wrangler d1 create zakynthos-trip
```

Wrangler prints a `database_id`. Copy it into `wrangler.toml`:

```toml
name = "web-zakynthos"
compatibility_date = "2026-06-10"
pages_build_output_dir = "dist"

[vars]
PUBLIC_READ = "false"

[[d1_databases]]
binding = "TRIP_DB"
database_name = "zakynthos-trip"
database_id = "the-cloudflare-d1-database-id"
```

The `binding` value must remain `TRIP_DB`; the Pages Function code requires that exact name.
The `PUBLIC_READ` value is intentionally stored in `wrangler.toml` because it is not a secret. Keep it set to `false` when hotel details, booking references, emergency contacts, or other private trip data are stored in the app.

### 3. Apply D1 migrations

Apply the checked-in migration files to the remote D1 database:

```powershell
npx wrangler d1 migrations apply zakynthos-trip --remote
```

This creates the shared tables used by the app: `trip_sections`, `notes`, `favorites`, and `checklist_items`.

### 4. Generate editor password hashes

Generate one hash per editor. Use a different random salt per editor, and do not reuse real passwords from other services.

```powershell
npm run hash:editor -- martin "choose-a-password" "choose-a-random-salt"
npm run hash:editor -- girlfriend "choose-a-password" "choose-another-random-salt"
```

Each command prints a one-user JSON array. Combine the generated objects into one array for `EDITOR_USERS_JSON`:

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

Do not commit real passwords, salts, generated hashes, or production `EDITOR_USERS_JSON` values.

### 5. Generate and apply seed SQL

Generate seed SQL from the current `content/*.json` files:

```powershell
node scripts/create-seed.mjs | Set-Content -Encoding utf8 .\seed.local.sql
Get-Content .\seed.local.sql -TotalCount 1
```

The first line must start with `insert into trip_sections`. If it starts with `>` or package-manager text, regenerate it with the `node scripts/create-seed.mjs` command.

Apply the seed file to the remote D1 database:

```powershell
npx wrangler d1 execute zakynthos-trip --remote --file=seed.local.sql
```

`seed.local.sql` is ignored by git. Delete it after setup if it contains trip details that should not remain on disk.

### 6. Build the static assets

Build the Pages output locally:

```powershell
npm install
npm run lint
npm run test
npm run build
```

The build output must be `dist`. Wrangler uploads the `dist` directory and includes Pages Functions from the repository's `functions/` directory when `wrangler pages deploy` runs from the project root.

### 7. Create the Pages project from the terminal

Create the Pages project with Wrangler:

```powershell
npx wrangler pages project create web-zakynthos
```

When prompted:

- Project name: `web-zakynthos`.
- Production branch: `main`.

This creates a real Pages project served at `<project-name>.pages.dev`. It does not create a Worker service.

### 8. Deploy with Wrangler Pages

Deploy the built Pages assets:

```powershell
npx wrangler pages deploy dist --project-name web-zakynthos
```

For a preview branch deployment, include the branch:

```powershell
npx wrangler pages deploy dist --project-name web-zakynthos --branch preview
```

### 9. Add the D1 binding in the dashboard

Pages Functions need the production D1 binding on the Pages project.

In the Cloudflare dashboard:

1. Open Workers & Pages.
2. Select the Pages project named `web-zakynthos`.
3. Open Settings.
4. Open Bindings.
5. Select Add binding.
6. Choose D1 database.
7. Set Variable name to `TRIP_DB`.
8. Select the D1 database named `zakynthos-trip`.
9. Save.

Redeploy after adding or changing a binding.

### 10. Add encrypted runtime secrets in the dashboard

Add app runtime secrets to the Pages project, not to a Worker and not to `wrangler.toml`. When a Pages project is managed by `wrangler.toml`, the dashboard may show this message:

```text
Environment variables for this project are being managed through wrangler.toml. Only Secrets (encrypted variables) can be managed via the Dashboard.
```

That is expected. `PUBLIC_READ` is the only non-secret app variable and is managed in `wrangler.toml`. `SESSION_SECRET` and `EDITOR_USERS_JSON` must be encrypted secrets.

In the Cloudflare dashboard:

1. Open Workers & Pages.
2. Select the Pages project named `web-zakynthos`.
3. Open Settings.
4. Open Variables and Secrets.
5. Select Add.
6. Add each value below to the Production environment.

Add `SESSION_SECRET`:

- Type: Secret, or select Encrypt if the dashboard offers encryption as a checkbox.
- Variable name: `SESSION_SECRET`
- Value: a long random string from a password manager

Add `EDITOR_USERS_JSON`:

- Type: Secret, or select Encrypt if available.
- Variable name: `EDITOR_USERS_JSON`
- Value: paste the combined editor JSON array from the hash-generation step as plain text

Do not add `PUBLIC_READ` in the dashboard. Change it in `wrangler.toml`, then redeploy.

Redeploy after adding or changing secrets.

### 11. Verify the deployed app

After the binding and runtime values are set and the project has been redeployed:

1. Open the Pages URL.
2. Confirm the app asks for login when `PUBLIC_READ=false`.
3. Confirm the app is visible and shows an Editor login button when `PUBLIC_READ=true`.
4. Log in as each editor.
5. Toggle a favorite, add a note, and update a checklist item.
6. Refresh the page and open the site on another device to confirm the changes persist.

## Worker vs Pages Troubleshooting

### Worker URLs are the wrong resource

A dashboard URL like this points to a Worker service, not a Pages project:

```text
https://dash.cloudflare.com/<account-id>/workers/services/view/web-zakynthos/production
```

The `workers/services/view/...` segment is the key signal. Do not configure this Worker for the trip planner. This app does not need a separate Worker; it must run as the Pages project named `web-zakynthos`.

Use this command to confirm the Pages project exists:

```powershell
npx wrangler pages project list
```

If `web-zakynthos` is missing, create the Pages project:

```powershell
npx wrangler pages project create web-zakynthos
```

### Recognize the correct Pages project

A Pages project appears under Workers & Pages as a Pages application and has a `web-zakynthos.pages.dev` deployment URL. Its settings include Pages deployment details, Pages Functions, Bindings, and Variables and Secrets.

From the terminal, list Pages projects with:

```powershell
npx wrangler pages project list
```

If the intended project name is missing from this list, it is not an existing Pages project in the selected account.

### Dashboard creates or opens a Worker instead of Pages

Do not configure the Worker. Create the Pages project named `web-zakynthos`, then deploy the Pages build:

```powershell
npx wrangler pages project create web-zakynthos
npm run build
npx wrangler pages deploy dist --project-name web-zakynthos
```

Then add the `TRIP_DB` binding and the encrypted `SESSION_SECRET` and `EDITOR_USERS_JSON` secrets to that Pages project. Keep `PUBLIC_READ` in `wrangler.toml`.

### `Project not found ... pages/projects/web-zakynthos`

This means Wrangler looked for a Pages project named `web-zakynthos` and did not find one in the current Cloudflare account. Run:

```powershell
npx wrangler whoami
npx wrangler pages project list
```

If no Pages project exists, create it:

```powershell
npx wrangler pages project create web-zakynthos
```

Then deploy with:

```powershell
npx wrangler pages deploy dist --project-name web-zakynthos
```

### `wrangler deploy` is wrong for this app

`wrangler deploy` deploys Workers. This repo has a Pages build output (`dist`), Pages Functions (`functions/`), and a Pages D1 binding (`TRIP_DB`), so deployment must use:

```powershell
npx wrangler pages deploy dist --project-name web-zakynthos
```

Do not add `main = "src/index.ts"` or `[assets]` to `wrangler.toml` to satisfy Worker deployment errors. That would document or configure a different deployment model than this app uses.

### `Missing entry-point to Worker script or to assets directory`

This error usually means Wrangler is trying to deploy a Worker. Replace the deploy command with `npx wrangler pages deploy dist --project-name web-zakynthos`.

### `Authentication error [code: 10000]`

Wrangler found credentials, but the token cannot perform the requested operation. Confirm the active account with `npx wrangler whoami`.

For deploy automation, create a scoped API token in Cloudflare Dashboard > My Profile > API Tokens > Create Token > Custom token:

1. Token name: `web-zakynthos-deploy`.
2. Permissions: `Account > Cloudflare Pages > Edit`.
3. Account resources: select the account that owns the Pages project.
4. Create the token and store the value as `CLOUDFLARE_API_TOKEN` in the local shell, CI secret store, or dashboard deploy-command setup.

If the same automation also creates or migrates D1 databases, it needs D1 write permissions too. Keep D1 setup manual unless automation explicitly owns that responsibility.

### `npx wrangler pages deploy` has no upload directory

The deploy command must include the built output directory:

```powershell
npx wrangler pages deploy dist --project-name web-zakynthos
```

Do not use:

```powershell
npx wrangler pages deploy
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

## Editor Access

Editor users are configured through the encrypted `EDITOR_USERS_JSON` Pages secret; no passwords, salts, or password hashes are committed to source control. Add both travelers to that JSON array when both should be able to edit the trip.

## Cost Notes

Cloudflare Pages, Pages Functions, and D1 have free-tier quotas suitable for a small two-person trip planner. No paid third-party APIs are required.

## Known Limitations

- The app uses normal save/refresh behavior, not real-time collaborative editing.
- Section editors use JSON for broad trip content changes.
- Draft section edits are kept in browser `localStorage` until saved or reset.
- Real booking details, private addresses, flight numbers, and emergency contacts should be entered through the protected app, not committed into seed JSON.
