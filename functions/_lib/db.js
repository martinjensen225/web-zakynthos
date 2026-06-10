const tripId = 'zakynthos-2026';
const sectionOrder = [
  'meta',
  'highlights',
  'quickLinks',
  'flights',
  'stay',
  'locations',
  'itinerary',
  'attractions',
  'restaurants',
  'planning',
  'duringTrip'
];

function db(env) {
  if (!env.TRIP_DB) {
    throw new Error('TRIP_DB binding is required.');
  }
  return env.TRIP_DB;
}

function now() {
  return new Date().toISOString();
}

export function defaultTripId() {
  return tripId;
}

export async function readTrip(env) {
  const database = db(env);
  const sections = await database
    .prepare('select section_key, json, version, updated_at from trip_sections where trip_id = ?')
    .bind(tripId)
    .all();

  const trip = {};
  const versions = {};
  for (const row of sections.results ?? []) {
    trip[row.section_key] = JSON.parse(row.json);
    versions[row.section_key] = {
      version: row.version,
      updatedAt: row.updated_at
    };
  }

  const missing = sectionOrder.filter((sectionKey) => trip[sectionKey] === undefined);
  if (missing.length > 0) {
    throw new Error(`Trip database has not been seeded. Missing sections: ${missing.join(', ')}`);
  }

  const [notes, favorites, checklistItems] = await Promise.all([
    database.prepare('select id, target_id as targetId, body, updated_at as updatedAt, updated_by as updatedBy from notes where trip_id = ? order by updated_at desc').bind(tripId).all(),
    database.prepare('select target_id as targetId, updated_at as updatedAt, updated_by as updatedBy from favorites where trip_id = ? order by updated_at desc').bind(tripId).all(),
    database.prepare('select id, text, status, done, sort_order as sortOrder, updated_at as updatedAt, updated_by as updatedBy from checklist_items where trip_id = ? order by sort_order, created_at').bind(tripId).all()
  ]);

  return {
    ...trip,
    notes: notes.results ?? [],
    favorites: favorites.results ?? [],
    checklistItems: (checklistItems.results ?? []).map((item) => ({ ...item, done: Boolean(item.done) })),
    versions
  };
}

export async function updateSection(env, sectionKey, value, expectedVersion, editor) {
  const database = db(env);
  const current = await database
    .prepare('select version from trip_sections where trip_id = ? and section_key = ?')
    .bind(tripId, sectionKey)
    .first();

  if (!current) {
    return { conflict: false, missing: true };
  }

  if (expectedVersion !== undefined && Number(expectedVersion) !== current.version) {
    return { conflict: true, currentVersion: current.version };
  }

  const nextVersion = current.version + 1;
  const updatedAt = now();
  await database
    .prepare('update trip_sections set json = ?, version = ?, updated_at = ?, updated_by = ? where trip_id = ? and section_key = ?')
    .bind(JSON.stringify(value), nextVersion, updatedAt, editor.username, tripId, sectionKey)
    .run();

  return { sectionKey, value, version: nextVersion, updatedAt };
}

export async function upsertNote(env, id, note, editor) {
  const noteId = id || crypto.randomUUID();
  const timestamp = now();
  await db(env)
    .prepare(`
      insert into notes (id, trip_id, target_id, body, created_at, updated_at, updated_by)
      values (?, ?, ?, ?, ?, ?, ?)
      on conflict(id) do update set target_id = excluded.target_id, body = excluded.body, updated_at = excluded.updated_at, updated_by = excluded.updated_by
    `)
    .bind(noteId, tripId, note.targetId, note.body, timestamp, timestamp, editor.username)
    .run();

  return { id: noteId, targetId: note.targetId, body: note.body, updatedAt: timestamp, updatedBy: editor.username };
}

export async function deleteNote(env, id) {
  await db(env).prepare('delete from notes where trip_id = ? and id = ?').bind(tripId, id).run();
}

export async function toggleFavorite(env, targetId, favorite, editor) {
  const database = db(env);
  if (favorite) {
    const timestamp = now();
    await database
      .prepare(`
        insert into favorites (trip_id, target_id, created_at, updated_at, updated_by)
        values (?, ?, ?, ?, ?)
        on conflict(trip_id, target_id) do update set updated_at = excluded.updated_at, updated_by = excluded.updated_by
      `)
      .bind(tripId, targetId, timestamp, timestamp, editor.username)
      .run();
    return { targetId, favorite: true, updatedAt: timestamp };
  }

  await database.prepare('delete from favorites where trip_id = ? and target_id = ?').bind(tripId, targetId).run();
  return { targetId, favorite: false };
}

export async function upsertChecklistItem(env, id, item, editor) {
  const itemId = id || crypto.randomUUID();
  const timestamp = now();
  const sortOrder = Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : Date.now();
  await db(env)
    .prepare(`
      insert into checklist_items (id, trip_id, text, status, done, sort_order, created_at, updated_at, updated_by)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(id) do update set text = excluded.text, status = excluded.status, done = excluded.done, sort_order = excluded.sort_order, updated_at = excluded.updated_at, updated_by = excluded.updated_by
    `)
    .bind(itemId, tripId, item.text, item.status, item.done ? 1 : 0, sortOrder, timestamp, timestamp, editor.username)
    .run();

  return { id: itemId, text: item.text, status: item.status, done: Boolean(item.done), sortOrder, updatedAt: timestamp, updatedBy: editor.username };
}

export async function deleteChecklistItem(env, id) {
  await db(env).prepare('delete from checklist_items where trip_id = ? and id = ?').bind(tripId, id).run();
}
