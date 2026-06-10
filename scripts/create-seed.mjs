import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tripId = 'zakynthos-2026';
const updatedAt = new Date().toISOString();
const updatedBy = 'seed';
const sectionFiles = {
  meta: 'meta.json',
  highlights: 'highlights.json',
  quickLinks: 'quick-links.json',
  flights: 'flights.json',
  stay: 'stay.json',
  locations: 'locations.json',
  itinerary: 'itinerary.json',
  attractions: 'attractions.json',
  restaurants: 'restaurants.json',
  planning: 'planning.json',
  duringTrip: 'during-trip.json'
};

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function readJson(fileName) {
  return JSON.parse(await readFile(path.join(root, 'content', fileName), 'utf8'));
}

console.log('begin transaction;');

for (const [sectionKey, fileName] of Object.entries(sectionFiles)) {
  const json = JSON.stringify(await readJson(fileName));
  console.log(
    `insert into trip_sections (trip_id, section_key, json, version, updated_at, updated_by) values (${sqlString(tripId)}, ${sqlString(sectionKey)}, ${sqlString(json)}, 1, ${sqlString(updatedAt)}, ${sqlString(updatedBy)}) on conflict(trip_id, section_key) do update set json = excluded.json, version = trip_sections.version + 1, updated_at = excluded.updated_at, updated_by = excluded.updated_by;`
  );
}

const planning = await readJson(sectionFiles.planning);
for (const [index, item] of planning.checklist.entries()) {
  console.log(
    `insert into checklist_items (id, trip_id, text, status, done, sort_order, created_at, updated_at, updated_by) values (${sqlString(item.id)}, ${sqlString(tripId)}, ${sqlString(item.text)}, ${sqlString(item.status)}, 0, ${index + 1}, ${sqlString(updatedAt)}, ${sqlString(updatedAt)}, ${sqlString(updatedBy)}) on conflict(id) do update set text = excluded.text, status = excluded.status, sort_order = excluded.sort_order, updated_at = excluded.updated_at, updated_by = excluded.updated_by;`
  );
}

console.log('commit;');
