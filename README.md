# Zakynthos September Guide

Mobile-first static trip guide for planning and using a September trip to Zakynthos, Greece. The site is designed to be useful before the trip for planning and during the trip as a quick phone guide.

## Tech stack

- Dependency-free static HTML, CSS, and JavaScript
- Editable trip content in `data/trip.js`
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

Most trip content lives in `data/trip.js`.

- Dates and title: edit `trip.meta.startDate`, `trip.meta.endDate`, `trip.meta.title`, and `trip.meta.subtitle`.
- Flights: edit `trip.flights`.
- Hotel/stay: edit `trip.stay` and the `hotel` entry in `trip.locations`.
- Attractions: edit `trip.attractions` and add matching `trip.locations` entries when map links are needed.
- Restaurants: edit `trip.restaurants`.
- Itinerary: edit `trip.itinerary`; each day has morning, afternoon, and evening sections.
- Packing list: edit `trip.planning.packing`.
- Budget notes: edit `trip.planning.budgetNotes`.
- Emergency and practical info: edit `trip.duringTrip`.

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
