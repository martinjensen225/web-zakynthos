# Zakynthos September Guide

Mobile-first static trip guide for planning and using a September trip to Zakynthos, Greece. The site is designed to be useful before the trip for planning and during the trip as a quick phone guide.

## Tech stack

- Dependency-free static HTML, CSS, and JavaScript
- Editable trip content in `content/*.json`
- Small loader glue in `data/trip.js`
- Plain CSS in `assets/styles.css`
- Browser-only `localStorage` for favorites, checklist state, and notes
- Google Maps search links generated from editable location data, with no Maps API key

## Local development

```powershell
npm install
npm run dev
npm run lint
npm run test
npm run build
npm run preview
```

The production build is written to `dist/`.

## Editing trip content

Most trip content lives in the files under `content/`.

- `content/meta.json`: title, dates, destination, subtitle, and traveler label.
- `content/flights.json`: outbound and return placeholders.
- `content/stay.json`: hotel or apartment details.
- `content/locations.json`: reusable map entries.
- `content/itinerary.json`: daily itinerary blocks.
- `content/attractions.json`: beaches, viewpoints, boat trips, villages, and rainy-day ideas.
- `content/restaurants.json`: wishlist and booked places.
- `content/planning.json`: checklist, packing list, budget notes, and open questions.
- `content/during-trip.json`: emergency placeholders, transport notes, and essentials.
- `content/highlights.json` and `content/quick-links.json`: home-page content.

The `data/trip.js` file only loads those JSON files together for the app.

Booking-specific values are intentionally placeholders until real bookings are available.

## Deployment

The repository includes `.github/workflows/deploy-pages.yml` for GitHub Pages.

Manual setup:

1. Open the GitHub repository settings.
2. Go to Pages.
3. Set Source to GitHub Actions.
4. Push to `main` or run the workflow manually.

The site uses relative links, so it can be served from GitHub Pages, a custom domain, or a local static server without changing a base path.

## Switching hosting later

- Azure Static Web Apps: use build command `npm run build`, app location `/`, output location `dist`, and add the deployment token secret required by the Azure-generated workflow.
- Cloudflare Pages: connect the repo in the Cloudflare dashboard, use build command `npm run build`, output directory `dist`, and Node 24.
- Any static host: build locally or in CI and publish `dist/`.

## Known limitations

- Favorites, checklist state, and notes are stored only in the current browser on the current device.
- There is no backend, account system, or cross-device sync.
- Google Maps links use normal search URLs, so exact results depend on Google Maps search behavior.
- The trip dates, hotel, flights, bookings, emergency details, and prices must be filled in manually.
