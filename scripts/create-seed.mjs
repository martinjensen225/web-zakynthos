import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

async function readJson(tripId, fileName) {
  return JSON.parse(await readFile(path.join(root, 'content', 'trips', tripId, fileName), 'utf8'));
}

const tripIds = (await readdir(path.join(root, 'content', 'trips'), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const tripId of tripIds) {
  for (const [sectionKey, fileName] of Object.entries(sectionFiles)) {
    const json = JSON.stringify(await readJson(tripId, fileName));
    console.log(
      `insert into trip_sections (trip_id, section_key, json, version, updated_at, updated_by) values (${sqlString(tripId)}, ${sqlString(sectionKey)}, ${sqlString(json)}, 1, ${sqlString(updatedAt)}, ${sqlString(updatedBy)}) on conflict(trip_id, section_key) do update set json = excluded.json, version = trip_sections.version + 1, updated_at = excluded.updated_at, updated_by = excluded.updated_by;`
    );
  }

  const planning = await readJson(tripId, sectionFiles.planning);
  for (const [index, item] of planning.checklist.entries()) {
    const checklistId = tripId === 'zakynthos-2026' ? item.id : `${tripId}-${item.id}`;
    console.log(
      `insert into checklist_items (id, trip_id, text, status, done, sort_order, created_at, updated_at, updated_by) values (${sqlString(checklistId)}, ${sqlString(tripId)}, ${sqlString(item.text)}, ${sqlString(item.status)}, 0, ${index + 1}, ${sqlString(updatedAt)}, ${sqlString(updatedAt)}, ${sqlString(updatedBy)}) on conflict(id) do update set text = excluded.text, status = excluded.status, sort_order = excluded.sort_order, updated_at = excluded.updated_at, updated_by = excluded.updated_by;`
    );
  }
}
