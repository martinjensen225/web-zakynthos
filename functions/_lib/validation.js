const sectionKeys = new Set([
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
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertText(value, path) {
  assert(typeof value === 'string' && value.trim().length > 0, `${path} is required.`);
}

function assertArray(value, path) {
  assert(Array.isArray(value), `${path} must be an array.`);
}

function validatePeriod(value, path) {
  assert(isObject(value), `${path} must be an object.`);
  assertText(value.title, `${path}.title`);
  assertText(value.plan, `${path}.plan`);
  if (value.locationIds !== undefined) {
    assertArray(value.locationIds, `${path}.locationIds`);
  }
}

export function validateSectionKey(sectionKey) {
  assert(sectionKeys.has(sectionKey), `Unknown trip section "${sectionKey}".`);
}

export function validateSection(sectionKey, value) {
  validateSectionKey(sectionKey);

  if (sectionKey === 'meta') {
    assert(isObject(value), 'meta must be an object.');
    assertText(value.title, 'meta.title');
    assertText(value.destination, 'meta.destination');
    assertText(value.startDate, 'meta.startDate');
    return;
  }

  if (['highlights', 'quickLinks', 'locations', 'itinerary', 'attractions', 'restaurants'].includes(sectionKey)) {
    assertArray(value, sectionKey);
    if (sectionKey !== 'highlights') {
      for (const item of value) {
        assertText(item.id ?? item.label, `${sectionKey} item id or label`);
      }
    }
  }

  if (sectionKey === 'flights') {
    assert(isObject(value), 'flights must be an object.');
    assertText(value.outbound, 'flights.outbound');
    assertText(value.return, 'flights.return');
    assertArray(value.notes, 'flights.notes');
  }

  if (sectionKey === 'stay') {
    assert(isObject(value), 'stay must be an object.');
    assertText(value.name, 'stay.name');
    assertArray(value.notes, 'stay.notes');
  }

  if (sectionKey === 'planning') {
    assert(isObject(value), 'planning must be an object.');
    assertArray(value.checklist, 'planning.checklist');
    assertArray(value.packing, 'planning.packing');
    assertArray(value.budgetNotes, 'planning.budgetNotes');
    assertArray(value.openQuestions, 'planning.openQuestions');
  }

  if (sectionKey === 'duringTrip') {
    assert(isObject(value), 'duringTrip must be an object.');
    assertArray(value.emergency, 'duringTrip.emergency');
    assertArray(value.transport, 'duringTrip.transport');
    assertArray(value.dailyEssentials, 'duringTrip.dailyEssentials');
  }

  if (sectionKey === 'itinerary') {
    for (const day of value) {
      assertText(day.id, 'itinerary.id');
      assertText(day.label, `${day.id}.label`);
      assertText(day.focus, `${day.id}.focus`);
      validatePeriod(day.morning, `${day.id}.morning`);
      validatePeriod(day.afternoon, `${day.id}.afternoon`);
      validatePeriod(day.evening, `${day.id}.evening`);
    }
  }
}

export function validateFullTrip(trip) {
  for (const sectionKey of sectionKeys) {
    validateSection(sectionKey, trip[sectionKey]);
  }

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
}

export function validateNote(value) {
  assert(isObject(value), 'Note payload must be an object.');
  assertText(value.targetId, 'targetId');
  assert(typeof value.body === 'string', 'body must be a string.');
}

export function validateChecklistItem(value) {
  assert(isObject(value), 'Checklist payload must be an object.');
  assertText(value.text, 'text');
  assertText(value.status, 'status');
  if (value.done !== undefined) {
    assert(typeof value.done === 'boolean', 'done must be a boolean.');
  }
}
