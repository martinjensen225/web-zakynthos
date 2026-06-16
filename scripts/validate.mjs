import { access, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateFullTrip } from '../functions/_lib/validation.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requiredPages = ['index.html', 'trip.html', 'itinerary.html', 'map.html', 'budget.html', 'more.html', 'attractions.html', 'stay.html', 'food.html', 'planning.html', 'guide.html'];
const contentFiles = [
  'meta.json',
  'highlights.json',
  'quick-links.json',
  'flights.json',
  'stay.json',
  'locations.json',
  'itinerary.json',
  'attractions.json',
  'restaurants.json',
  'planning.json',
  'during-trip.json'
];
const requiredSharedAppFiles = [
  'functions/api/[[path]].js',
  'functions/_lib/auth.js',
  'functions/_lib/db.js',
  'functions/_lib/http.js',
  'functions/_lib/validation.js',
  'migrations/0001_trip_app.sql',
  'scripts/create-seed.mjs',
  'scripts/hash-editor-password.mjs',
  'wrangler.toml',
  '.dev.vars.example'
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

async function validateTripContent(tripId) {
  for (const fileName of contentFiles) {
    await access(path.join(root, 'content', 'trips', tripId, fileName));
  }

  const [meta, highlights, quickLinks, flights, stay, locations, itinerary, attractions, restaurants, planning, duringTrip] = await Promise.all([
    readJson(`content/trips/${tripId}/meta.json`),
    readJson(`content/trips/${tripId}/highlights.json`),
    readJson(`content/trips/${tripId}/quick-links.json`),
    readJson(`content/trips/${tripId}/flights.json`),
    readJson(`content/trips/${tripId}/stay.json`),
    readJson(`content/trips/${tripId}/locations.json`),
    readJson(`content/trips/${tripId}/itinerary.json`),
    readJson(`content/trips/${tripId}/attractions.json`),
    readJson(`content/trips/${tripId}/restaurants.json`),
    readJson(`content/trips/${tripId}/planning.json`),
    readJson(`content/trips/${tripId}/during-trip.json`)
  ]);

  assert(meta.title, `${tripId}: meta.title is required.`);
  assert(meta.startDate, `${tripId}: meta.startDate is required.`);
  assert(meta.destination, `${tripId}: meta.destination is required.`);
  assert(Array.isArray(locations) && locations.length > 0, `${tripId}: at least one location is required.`);
  assert(Array.isArray(itinerary) && itinerary.length > 0, `${tripId}: at least one itinerary day is required.`);
  assert(Array.isArray(highlights) && highlights.length > 0, `${tripId}: at least one highlight is required.`);
  assert(Array.isArray(quickLinks) && quickLinks.length > 0, `${tripId}: at least one quick link is required.`);
  assert(Array.isArray(flights.notes), `${tripId}: flights.notes must be an array.`);
  assert(Array.isArray(stay.notes), `${tripId}: stay.notes must be an array.`);
  assert(Array.isArray(planning.checklist), `${tripId}: planning.checklist must be an array.`);
  assert(Array.isArray(planning.decisions), `${tripId}: planning.decisions must be an array.`);
  assert(Array.isArray(planning.tasks), `${tripId}: planning.tasks must be an array.`);
  assert(Array.isArray(planning.packing), `${tripId}: planning.packing must be an array.`);
  assert(Array.isArray(planning.budget.expenses), `${tripId}: planning.budget.expenses must be an array.`);
  assert(Array.isArray(planning.documents), `${tripId}: planning.documents must be an array.`);
  assert(Array.isArray(duringTrip.emergency), `${tripId}: duringTrip.emergency must be an array.`);

  validateFullTrip({
    meta,
    highlights,
    quickLinks,
    flights,
    stay,
    locations,
    itinerary,
    attractions,
    restaurants,
    planning,
    duringTrip
  });

  const locationIds = new Set(locations.map((location) => location.id));
  for (const day of itinerary) {
    assert(Array.isArray(day.items) && day.items.length > 0, `${tripId}: ${day.id} must have plan items.`);
    for (const item of day.items) {
      if (item.locationId) {
        assert(locationIds.has(item.locationId), `${tripId}: unknown location "${item.locationId}" in ${item.id}.`);
      }
    }
  }

  for (const attraction of attractions) {
    if (attraction.locationId) {
      assert(locationIds.has(attraction.locationId), `${tripId}: unknown location "${attraction.locationId}" in ${attraction.id}.`);
    }
  }

  for (const restaurant of restaurants) {
    if (restaurant.locationId) {
      assert(locationIds.has(restaurant.locationId), `${tripId}: unknown location "${restaurant.locationId}" in ${restaurant.id}.`);
    }
  }
}

for (const page of requiredPages) {
  await access(path.join(root, page));
}

for (const fileName of requiredSharedAppFiles) {
  await access(path.join(root, fileName));
}

const tripIds = (await readdir(path.join(root, 'content', 'trips'), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
assert(tripIds.includes('zakynthos-2026'), 'Zakynthos must remain seeded as content/trips/zakynthos-2026.');
assert(tripIds[0] === 'zakynthos-2026', 'Zakynthos must remain the first trip entry.');

for (const tripId of tripIds) {
  await validateTripContent(tripId);
}

const css = await readFile(path.join(root, 'assets/styles.css'), 'utf8');
assert(!css.includes('font-size: vw'), 'Do not scale font sizes directly with viewport width.');

const imageStats = await stat(path.join(root, 'public/images/zakynthos-hero.png'));
assert(imageStats.size > 1000, 'Hero image appears to be empty.');

const app = await readFile(path.join(root, 'assets/app.js'), 'utf8');
assert(!app.includes('zakynthos:favorites'), 'Favorites must not use local-only storage.');
assert(!app.includes('zakynthos:notes'), 'Notes must not use local-only storage.');
assert(!app.includes('zakynthos:checks'), 'Checklist state must not use local-only storage.');
assert(app.includes('renderPortfolio'), 'The app must render an all-trips portfolio.');
assert(app.includes('setupTripManagement'), 'The portfolio must support creating, editing, and deleting trips.');
assert(app.includes('setupInlineEditing'), 'Editor mode must edit the visible trip cards inline.');
assert(app.includes('floatingAdd'), 'Primary planning screens must expose a floating Add control.');
assert(app.includes('renderMore'), 'The app must render More tools for ideas, decisions, documents, packing, and tasks.');
assert(app.includes('data-add-path'), 'Editor mode must support adding section items.');
assert(app.includes('data-remove-path'), 'Editor mode must support removing section items.');
assert(app.includes('saveSection(trip.id'), 'Structured section edits must save through the trip-scoped API.');
assert(app.includes('data-reorder-section'), 'Editor mode must support drag-and-drop reordering.');
assert(app.includes('data-place-section'), 'Editor mode must use clickable place mapping controls.');
assert(app.includes('quickLinkPicker'), 'Quick links must use a friendly page picker.');

const dataClient = await readFile(path.join(root, 'data/trip.js'), 'utf8');
assert(dataClient.includes('/api/trips'), 'The app must load shared trip data from the trip collection API.');

const seedScript = await readFile(path.join(root, 'scripts/create-seed.mjs'), 'utf8');
assert(!seedScript.includes("console.log('begin transaction;')"), 'Seed SQL must not emit BEGIN TRANSACTION for Wrangler D1 execute.');
assert(!seedScript.includes("console.log('commit;')"), 'Seed SQL must not emit COMMIT for Wrangler D1 execute.');

const wranglerConfig = await readFile(path.join(root, 'wrangler.toml'), 'utf8');
assert(wranglerConfig.includes('[vars]'), 'wrangler.toml must define non-secret runtime vars.');
assert(/PUBLIC_READ\s*=\s*"(true|false)"/.test(wranglerConfig), 'PUBLIC_READ must be a non-secret runtime var in wrangler.toml.');
assert(!wranglerConfig.includes('SESSION_SECRET'), 'SESSION_SECRET must be an encrypted Pages secret, not a committed Wrangler var.');
assert(!wranglerConfig.includes('EDITOR_USERS_JSON'), 'EDITOR_USERS_JSON must be an encrypted Pages secret, not a committed Wrangler var.');

console.log('Validation passed.');
