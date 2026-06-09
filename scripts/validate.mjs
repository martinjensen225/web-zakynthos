import { access, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { trip } = await import(pathToFileURL(path.join(root, 'data/trip.js')));
const requiredPages = ['index.html', 'itinerary.html', 'attractions.html', 'stay.html', 'food.html', 'map.html', 'planning.html', 'guide.html'];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const page of requiredPages) {
  await access(path.join(root, page));
}

assert(trip.meta.title, 'trip.meta.title is required.');
assert(trip.meta.startDate, 'trip.meta.startDate is required.');
assert(trip.locations.length > 0, 'At least one location is required.');
assert(trip.itinerary.length > 0, 'At least one itinerary day is required.');

const locationIds = new Set(trip.locations.map((location) => location.id));
for (const day of trip.itinerary) {
  for (const period of ['morning', 'afternoon', 'evening']) {
    for (const locationId of day[period].locationIds ?? []) {
      assert(locationIds.has(locationId), `Unknown location "${locationId}" in ${day.id}.`);
    }
  }
}

for (const attraction of trip.attractions) {
  if (attraction.locationId) {
    assert(locationIds.has(attraction.locationId), `Unknown location "${attraction.locationId}" in ${attraction.id}.`);
  }
}

for (const restaurant of trip.restaurants) {
  if (restaurant.locationId) {
    assert(locationIds.has(restaurant.locationId), `Unknown location "${restaurant.locationId}" in ${restaurant.id}.`);
  }
}

const css = await readFile(path.join(root, 'assets/styles.css'), 'utf8');
assert(!css.includes('font-size: vw'), 'Do not scale font sizes directly with viewport width.');

const publicFiles = await readdir(path.join(root, 'public/images'));
assert(publicFiles.includes('zakynthos-hero.png'), 'Hero image is missing.');

const imageStats = await stat(path.join(root, 'public/images/zakynthos-hero.png'));
assert(imageStats.size > 1000, 'Hero image appears to be empty.');

console.log('Validation passed.');
