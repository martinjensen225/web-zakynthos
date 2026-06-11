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

function assertOptionalText(value, path) {
  if (value !== undefined) {
    assert(typeof value === 'string', `${path} must be text.`);
  }
}

function assertArray(value, path) {
  assert(Array.isArray(value), `${path} must be an array.`);
}

function assertBoolean(value, path) {
  if (value !== undefined) {
    assert(typeof value === 'boolean', `${path} must be true or false.`);
  }
}

function assertStringArray(value, path) {
  assertArray(value, path);
  for (const item of value) {
    assert(typeof item === 'string', `${path} items must be text.`);
  }
}

function validatePeriod(value, path) {
  assert(isObject(value), `${path} must be an object.`);
  assertText(value.title, `${path}.title`);
  assertText(value.plan, `${path}.plan`);
  assertOptionalText(value.notes, `${path}.notes`);
  if (value.locationIds !== undefined) {
    assertStringArray(value.locationIds, `${path}.locationIds`);
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
    assertText(value.endDate, 'meta.endDate');
    assertText(value.travelers, 'meta.travelers');
    assertText(value.subtitle, 'meta.subtitle');
    return;
  }

  if (['highlights', 'quickLinks', 'locations', 'itinerary', 'attractions', 'restaurants'].includes(sectionKey)) {
    assertArray(value, sectionKey);
    if (sectionKey === 'highlights') {
      for (const item of value) {
        assertText(item, `${sectionKey} item`);
      }
    } else {
      for (const [index, item] of value.entries()) {
        assert(isObject(item), `${sectionKey}[${index}] must be an object.`);
        assertText(item.id ?? item.label, `${sectionKey}[${index}] id or label`);
      }
    }
  }

  if (sectionKey === 'quickLinks') {
    for (const item of value) {
      assertText(item.label, 'quickLinks.label');
      assertText(item.href, 'quickLinks.href');
    }
  }

  if (sectionKey === 'flights') {
    assert(isObject(value), 'flights must be an object.');
    assertText(value.outbound, 'flights.outbound');
    assertText(value.return, 'flights.return');
    assertStringArray(value.notes, 'flights.notes');
  }

  if (sectionKey === 'stay') {
    assert(isObject(value), 'stay must be an object.');
    assertText(value.name, 'stay.name');
    assertText(value.checkIn, 'stay.checkIn');
    assertText(value.checkOut, 'stay.checkOut');
    assertText(value.address, 'stay.address');
    assertText(value.contact, 'stay.contact');
    assertText(value.bookingReference, 'stay.bookingReference');
    assertText(value.locationId, 'stay.locationId');
    assertStringArray(value.notes, 'stay.notes');
  }

  if (sectionKey === 'locations') {
    for (const location of value) {
      assertText(location.name, 'locations.name');
      assertText(location.area, 'locations.area');
      assertText(location.category, 'locations.category');
      assertText(location.mapQuery, 'locations.mapQuery');
      assertOptionalText(location.notes, 'locations.notes');
    }
  }

  if (sectionKey === 'attractions') {
    for (const attraction of value) {
      assertText(attraction.name, 'attractions.name');
      assertText(attraction.category, 'attractions.category');
      assertText(attraction.area, 'attractions.area');
      assertText(attraction.summary, 'attractions.summary');
      assertText(attraction.bestFor, 'attractions.bestFor');
      assertOptionalText(attraction.locationId, 'attractions.locationId');
      assertBoolean(attraction.mustDo, 'attractions.mustDo');
    }
  }

  if (sectionKey === 'restaurants') {
    const statuses = new Set(['placeholder', 'wishlist', 'planned', 'booked', 'confirmed']);
    for (const restaurant of value) {
      assertText(restaurant.name, 'restaurants.name');
      assertText(restaurant.area, 'restaurants.area');
      assertText(restaurant.status, 'restaurants.status');
      assert(statuses.has(restaurant.status), `Unknown restaurant status "${restaurant.status}".`);
      assertText(restaurant.cuisine, 'restaurants.cuisine');
      assertText(restaurant.notes, 'restaurants.notes');
      assertOptionalText(restaurant.locationId, 'restaurants.locationId');
    }
  }

  if (sectionKey === 'planning') {
    assert(isObject(value), 'planning must be an object.');
    assertArray(value.checklist, 'planning.checklist');
    for (const item of value.checklist) {
      assert(isObject(item), 'planning.checklist items must be objects.');
      assertText(item.id, 'planning.checklist.id');
      assertText(item.text, 'planning.checklist.text');
      assertText(item.status, 'planning.checklist.status');
    }
    assertStringArray(value.packing, 'planning.packing');
    assertStringArray(value.budgetNotes, 'planning.budgetNotes');
    assertStringArray(value.openQuestions, 'planning.openQuestions');
  }

  if (sectionKey === 'duringTrip') {
    assert(isObject(value), 'duringTrip must be an object.');
    assertStringArray(value.emergency, 'duringTrip.emergency');
    assertStringArray(value.transport, 'duringTrip.transport');
    assertStringArray(value.dailyEssentials, 'duringTrip.dailyEssentials');
    assertStringArray(value.savedPlaces, 'duringTrip.savedPlaces');
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
  assert(locationIds.has(trip.stay.locationId), `Unknown stay location "${trip.stay.locationId}".`);

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
