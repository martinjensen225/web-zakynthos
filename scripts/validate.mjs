import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateFullTrip } from '../functions/_lib/validation.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requiredPages = ['index.html', 'itinerary.html', 'attractions.html', 'stay.html', 'food.html', 'map.html', 'planning.html', 'guide.html'];
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

for (const page of requiredPages) {
  await access(path.join(root, page));
}

for (const fileName of contentFiles) {
  await access(path.join(root, 'content', fileName));
}

for (const fileName of requiredSharedAppFiles) {
  await access(path.join(root, fileName));
}

const [meta, highlights, quickLinks, flights, stay, locations, itinerary, attractions, restaurants, planning, duringTrip] = await Promise.all([
  readJson('content/meta.json'),
  readJson('content/highlights.json'),
  readJson('content/quick-links.json'),
  readJson('content/flights.json'),
  readJson('content/stay.json'),
  readJson('content/locations.json'),
  readJson('content/itinerary.json'),
  readJson('content/attractions.json'),
  readJson('content/restaurants.json'),
  readJson('content/planning.json'),
  readJson('content/during-trip.json')
]);

assert(meta.title, 'meta.title is required.');
assert(meta.startDate, 'meta.startDate is required.');
assert(meta.destination, 'meta.destination is required.');
assert(Array.isArray(locations) && locations.length > 0, 'At least one location is required.');
assert(Array.isArray(itinerary) && itinerary.length > 0, 'At least one itinerary day is required.');
assert(Array.isArray(highlights) && highlights.length > 0, 'At least one highlight is required.');
assert(Array.isArray(quickLinks) && quickLinks.length > 0, 'At least one quick link is required.');
assert(Array.isArray(flights.notes), 'flights.notes must be an array.');
assert(Array.isArray(stay.notes), 'stay.notes must be an array.');
assert(Array.isArray(planning.checklist), 'planning.checklist must be an array.');
assert(Array.isArray(duringTrip.emergency), 'duringTrip.emergency must be an array.');

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
  for (const period of ['morning', 'afternoon', 'evening']) {
    for (const locationId of day[period].locationIds ?? []) {
      assert(locationIds.has(locationId), `Unknown location "${locationId}" in ${day.id}.`);
    }
  }
}

for (const attraction of attractions) {
  if (attraction.locationId) {
    assert(locationIds.has(attraction.locationId), `Unknown location "${attraction.locationId}" in ${attraction.id}.`);
  }
}

for (const restaurant of restaurants) {
  if (restaurant.locationId) {
    assert(locationIds.has(restaurant.locationId), `Unknown location "${restaurant.locationId}" in ${restaurant.id}.`);
  }
}

const css = await readFile(path.join(root, 'assets/styles.css'), 'utf8');
assert(!css.includes('font-size: vw'), 'Do not scale font sizes directly with viewport width.');

const imageStats = await stat(path.join(root, 'public/images/zakynthos-hero.png'));
assert(imageStats.size > 1000, 'Hero image appears to be empty.');

const app = await readFile(path.join(root, 'assets/app.js'), 'utf8');
assert(!app.includes('zakynthos:favorites'), 'Favorites must not use local-only storage.');
assert(!app.includes('zakynthos:notes'), 'Notes must not use local-only storage.');
assert(!app.includes('zakynthos:checks'), 'Checklist state must not use local-only storage.');

const dataClient = await readFile(path.join(root, 'data/trip.js'), 'utf8');
assert(dataClient.includes('/api/trip'), 'The app must load shared trip data from the API.');

console.log('Validation passed.');
