export const defaultTripId = 'zakynthos-2026';

export const sectionOrder = [
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

function slug(value) {
  return String(value || 'trip')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'trip';
}

function parseSectionRows(rows) {
  const trip = {};
  const versions = {};
  for (const row of rows ?? []) {
    trip[row.section_key] = JSON.parse(row.json);
    versions[row.section_key] = {
      version: row.version,
      updatedAt: row.updated_at
    };
  }
  return { trip, versions };
}

function tripSummary(tripId, trip, updatedAt = '') {
  const planning = trip.planning ?? {};
  const decisions = planning.decisions ?? [];
  const tasks = planning.tasks ?? [];
  const openDecisions = decisions.filter((decision) => !['Decided', 'Archived'].includes(decision.status)).length;
  const openTasks = tasks.filter((task) => task.status !== 'Done').length;
  const readinessDone = [
    Boolean(trip.meta?.startDate && trip.meta?.endDate),
    Boolean(trip.flights?.outbound),
    Boolean(trip.stay?.name),
    Boolean((trip.itinerary ?? []).length),
    Boolean((trip.attractions ?? []).length || (trip.restaurants ?? []).length),
    Boolean((planning.budget?.expenses ?? []).length),
    Boolean((planning.documents ?? []).length),
    Boolean((planning.packing ?? []).length)
  ].filter(Boolean).length;

  return {
    id: tripId,
    title: trip.meta?.title ?? tripId,
    destination: trip.meta?.destination ?? '',
    startDate: trip.meta?.startDate ?? '',
    endDate: trip.meta?.endDate ?? '',
    travelers: trip.meta?.travelers ?? '',
    subtitle: trip.meta?.subtitle ?? '',
    coverImage: trip.meta?.coverImage ?? '',
    coverAlt: trip.meta?.coverAlt ?? '',
    mood: trip.meta?.mood ?? [],
    status: openDecisions || openTasks ? 'Needs attention' : 'Looking good',
    openDecisions,
    openTasks,
    readiness: Math.round((readinessDone / 8) * 100),
    updatedAt
  };
}

function blankTripSections(meta, tripId = 'trip') {
  const destination = meta.destination || 'Destination pending';
  return {
    meta: {
      title: meta.title,
      destination,
      month: '',
      startDate: meta.startDate,
      endDate: meta.endDate,
      travelers: meta.travelers,
      members: [],
      mood: meta.mood ?? ['Relaxed'],
      subtitle: meta.subtitle || 'A shared travel cockpit for planning this trip together.',
      coverImage: meta.coverImage || './public/images/zakynthos-hero.png',
      coverAlt: meta.coverAlt || destination
    },
    highlights: ['Add the first trip highlight.'],
    quickLinks: [
      { label: 'Plan timeline', href: './itinerary.html' },
      { label: 'Saved places', href: './map.html' },
      { label: 'Budget', href: './budget.html' },
      { label: 'Travel wallet', href: './guide.html' }
    ],
    flights: {
      outbound: 'Add outbound travel details.',
      return: 'Add return travel details.',
      notes: ['Add transport notes when bookings are known.']
    },
    stay: {
      name: 'Accommodation pending',
      checkIn: 'Add check-in time',
      checkOut: 'Add check-out time',
      address: destination,
      contact: 'Add contact details',
      bookingReference: 'Add booking reference',
      locationId: 'base',
      image: '',
      notes: ['Add accommodation notes.']
    },
    locations: [
      {
        id: 'base',
        name: destination,
        area: destination,
        category: 'Base',
        mapQuery: destination,
        notes: 'Starting point for this trip.',
        image: '',
        status: 'Idea'
      }
    ],
    itinerary: [
      {
        id: 'day-1',
        label: 'Day 1',
        date: meta.startDate || 'Add date',
        isoDate: meta.startDate || '',
        destination,
        focus: 'Add the day focus.',
        mood: 'Flexible',
        balance: 'Balanced',
        balanceReason: 'Add why this day feels balanced.',
        items: [
          {
            id: 'item-arrival',
            type: 'Note',
            period: 'Flexible',
            time: '',
            title: 'Start planning this day',
            locationId: 'base',
            status: 'Idea',
            cost: '',
            booking: '',
            notes: 'Add the first plan item.'
          }
        ]
      }
    ],
    attractions: [],
    restaurants: [],
    planning: {
      checklist: [
        { id: `${tripId}-check-dates`, text: 'Confirm travel dates', status: 'To do' },
        { id: `${tripId}-check-stay`, text: 'Add accommodation details', status: 'To do' }
      ],
      packing: [],
      budgetNotes: [],
      openQuestions: [],
      decisions: [],
      tasks: [],
      budget: { currency: 'EUR', target: 0, comfort: '', notes: '', expenses: [] },
      documents: []
    },
    duringTrip: {
      wallet: [],
      emergency: ['Add emergency contacts.'],
      transport: ['Add local transport notes.'],
      dailyEssentials: ['Add daily essentials.'],
      savedPlaces: []
    }
  };
}

export async function listTrips(env) {
  const rows = await db(env)
    .prepare('select trip_id, section_key, json, updated_at from trip_sections order by trip_id, section_key')
    .all();
  const grouped = new Map();
  const updated = new Map();
  for (const row of rows.results ?? []) {
    const group = grouped.get(row.trip_id) ?? {};
    group[row.section_key] = JSON.parse(row.json);
    grouped.set(row.trip_id, group);
    updated.set(row.trip_id, row.updated_at > (updated.get(row.trip_id) ?? '') ? row.updated_at : updated.get(row.trip_id) ?? row.updated_at);
  }

  return [...grouped.entries()]
    .filter(([, trip]) => trip.meta)
    .map(([id, trip]) => tripSummary(id, trip, updated.get(id)))
    .sort((a, b) => {
      if (a.id === defaultTripId) {
        return -1;
      }
      if (b.id === defaultTripId) {
        return 1;
      }
      return (a.startDate || '').localeCompare(b.startDate || '');
    });
}

export async function readTrip(env, tripId) {
  const database = db(env);
  const sections = await database
    .prepare('select section_key, json, version, updated_at from trip_sections where trip_id = ?')
    .bind(tripId)
    .all();

  const { trip, versions } = parseSectionRows(sections.results);
  if (Object.keys(trip).length === 0) {
    return null;
  }

  const missing = sectionOrder.filter((sectionKey) => trip[sectionKey] === undefined);
  if (missing.length > 0) {
    throw new Error(`Trip database has not been seeded. Missing sections for ${tripId}: ${missing.join(', ')}`);
  }

  const [notes, favorites, checklistItems] = await Promise.all([
    database.prepare('select id, target_id as targetId, body, updated_at as updatedAt, updated_by as updatedBy from notes where trip_id = ? order by updated_at desc').bind(tripId).all(),
    database.prepare('select target_id as targetId, updated_at as updatedAt, updated_by as updatedBy from favorites where trip_id = ? order by updated_at desc').bind(tripId).all(),
    database.prepare('select id, text, status, done, sort_order as sortOrder, updated_at as updatedAt, updated_by as updatedBy from checklist_items where trip_id = ? order by sort_order, created_at').bind(tripId).all()
  ]);

  return {
    id: tripId,
    ...trip,
    notes: notes.results ?? [],
    favorites: favorites.results ?? [],
    checklistItems: (checklistItems.results ?? []).map((item) => ({ ...item, done: Boolean(item.done) })),
    versions
  };
}

export async function createTrip(env, input, editor) {
  const title = String(input.title ?? '').trim();
  if (!title) {
    throw new Error('Trip title is required.');
  }
  for (const [key, label] of [
    ['destination', 'Destination'],
    ['startDate', 'Start date'],
    ['endDate', 'End date'],
    ['travelers', 'Travelers']
  ]) {
    if (!String(input[key] ?? '').trim()) {
      throw new Error(`${label} is required.`);
    }
  }

  const database = db(env);
  const baseId = slug(input.id || `${title}-${String(input.startDate || '').slice(0, 4)}`);
  let tripId = baseId;
  let index = 2;
  while (await database.prepare('select 1 from trip_sections where trip_id = ? limit 1').bind(tripId).first()) {
    tripId = `${baseId}-${index}`;
    index += 1;
  }

  const timestamp = now();
  const sections = blankTripSections({
    title,
    destination: String(input.destination ?? '').trim(),
    startDate: String(input.startDate ?? '').trim(),
    endDate: String(input.endDate ?? '').trim(),
    travelers: String(input.travelers ?? '').trim(),
    subtitle: String(input.subtitle ?? '').trim(),
    coverImage: String(input.coverImage ?? '').trim(),
    coverAlt: String(input.coverAlt ?? '').trim(),
    mood: Array.isArray(input.mood) ? input.mood : String(input.mood ?? '').split(',').map((item) => item.trim()).filter(Boolean)
  }, tripId);

  const statements = sectionOrder.map((sectionKey) => database
    .prepare('insert into trip_sections (trip_id, section_key, json, version, updated_at, updated_by) values (?, ?, ?, 1, ?, ?)')
    .bind(tripId, sectionKey, JSON.stringify(sections[sectionKey]), timestamp, editor.username));
  await database.batch(statements);

  for (const [sortOrder, item] of sections.planning.checklist.entries()) {
    await database
      .prepare('insert into checklist_items (id, trip_id, text, status, done, sort_order, created_at, updated_at, updated_by) values (?, ?, ?, ?, 0, ?, ?, ?, ?)')
      .bind(item.id, tripId, item.text, item.status, sortOrder + 1, timestamp, timestamp, editor.username)
      .run();
  }

  return await readTrip(env, tripId);
}

export async function deleteTrip(env, tripId) {
  const database = db(env);
  const existing = await database.prepare('select 1 from trip_sections where trip_id = ? limit 1').bind(tripId).first();
  if (!existing) {
    return false;
  }
  await database.batch([
    database.prepare('delete from notes where trip_id = ?').bind(tripId),
    database.prepare('delete from favorites where trip_id = ?').bind(tripId),
    database.prepare('delete from checklist_items where trip_id = ?').bind(tripId),
    database.prepare('delete from trip_sections where trip_id = ?').bind(tripId)
  ]);
  return true;
}

export async function updateSection(env, tripId, sectionKey, value, expectedVersion, editor) {
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

export async function upsertNote(env, tripId, id, note, editor) {
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

export async function deleteNote(env, tripId, id) {
  await db(env).prepare('delete from notes where trip_id = ? and id = ?').bind(tripId, id).run();
}

export async function toggleFavorite(env, tripId, targetId, favorite, editor) {
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

export async function upsertChecklistItem(env, tripId, id, item, editor) {
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

export async function deleteChecklistItem(env, tripId, id) {
  await db(env).prepare('delete from checklist_items where trip_id = ? and id = ?').bind(tripId, id).run();
}
