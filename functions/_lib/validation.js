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

function assertNumber(value, path) {
  if (value !== undefined) {
    assert(typeof value === 'number' && Number.isFinite(value), `${path} must be a number.`);
  }
}

function assertStringArray(value, path) {
  assertArray(value, path);
  for (const item of value) {
    assert(typeof item === 'string', `${path} items must be text.`);
  }
}

function validateTextOrObjectList(value, path, objectValidator) {
  assertArray(value, path);
  for (const [index, item] of value.entries()) {
    if (typeof item === 'string') {
      assertText(item, `${path}[${index}]`);
    } else {
      objectValidator(item, `${path}[${index}]`);
    }
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

function validateItineraryItem(value, path) {
  assert(isObject(value), `${path} must be an object.`);
  assertText(value.id, `${path}.id`);
  assertText(value.type, `${path}.type`);
  assertText(value.title, `${path}.title`);
  assertOptionalText(value.period, `${path}.period`);
  assertOptionalText(value.time, `${path}.time`);
  assertOptionalText(value.locationId, `${path}.locationId`);
  assertOptionalText(value.status, `${path}.status`);
  assertOptionalText(value.cost, `${path}.cost`);
  assertOptionalText(value.booking, `${path}.booking`);
  assertOptionalText(value.notes, `${path}.notes`);
  assertOptionalText(value.documentId, `${path}.documentId`);
}

function validateDecision(value, path) {
  assert(isObject(value), `${path} must be an object.`);
  assertText(value.id, `${path}.id`);
  assertText(value.title, `${path}.title`);
  assertText(value.status, `${path}.status`);
  assertOptionalText(value.type, `${path}.type`);
  assertOptionalText(value.linkedItemId, `${path}.linkedItemId`);
  assertOptionalText(value.finalChoice, `${path}.finalChoice`);
  assertOptionalText(value.notes, `${path}.notes`);
  if (value.options !== undefined) {
    assertArray(value.options, `${path}.options`);
    for (const [index, option] of value.options.entries()) {
      assert(isObject(option), `${path}.options[${index}] must be an object.`);
      assertText(option.id, `${path}.options[${index}].id`);
      assertText(option.title, `${path}.options[${index}].title`);
      assertOptionalText(option.martin, `${path}.options[${index}].martin`);
      assertOptionalText(option.marta, `${path}.options[${index}].marta`);
      assertOptionalText(option.notes, `${path}.options[${index}].notes`);
    }
  }
}

function validateTask(value, path) {
  assert(isObject(value), `${path} must be an object.`);
  assertText(value.id, `${path}.id`);
  assertText(value.title, `${path}.title`);
  assertText(value.status, `${path}.status`);
  assertOptionalText(value.assignee, `${path}.assignee`);
  assertOptionalText(value.dueDate, `${path}.dueDate`);
  assertOptionalText(value.priority, `${path}.priority`);
  assertOptionalText(value.linkedItemId, `${path}.linkedItemId`);
  assertOptionalText(value.notes, `${path}.notes`);
}

function validatePackingItem(value, path) {
  assert(isObject(value), `${path} must be an object.`);
  assertText(value.id, `${path}.id`);
  assertText(value.text, `${path}.text`);
  assertOptionalText(value.owner, `${path}.owner`);
  assertOptionalText(value.category, `${path}.category`);
  assertBoolean(value.essential, `${path}.essential`);
  assertBoolean(value.packed, `${path}.packed`);
}

function validateExpense(value, path) {
  assert(isObject(value), `${path} must be an object.`);
  assertText(value.id, `${path}.id`);
  assertText(value.title, `${path}.title`);
  assertNumber(value.amount, `${path}.amount`);
  assertOptionalText(value.currency, `${path}.currency`);
  assertOptionalText(value.category, `${path}.category`);
  assertOptionalText(value.paidBy, `${path}.paidBy`);
  assertOptionalText(value.splitBetween, `${path}.splitBetween`);
  assertOptionalText(value.status, `${path}.status`);
  assertOptionalText(value.linkedItemId, `${path}.linkedItemId`);
  assertOptionalText(value.notes, `${path}.notes`);
}

function validateDocument(value, path) {
  assert(isObject(value), `${path} must be an object.`);
  assertText(value.id, `${path}.id`);
  assertText(value.title, `${path}.title`);
  assertText(value.type, `${path}.type`);
  assertText(value.status, `${path}.status`);
  assertOptionalText(value.linkedItemId, `${path}.linkedItemId`);
  assertBoolean(value.important, `${path}.important`);
  assertBoolean(value.offline, `${path}.offline`);
  assertOptionalText(value.reference, `${path}.reference`);
  assertOptionalText(value.notes, `${path}.notes`);
}

function validateQuestion(value, path) {
  assert(isObject(value), `${path} must be an object.`);
  assertText(value.id, `${path}.id`);
  assertText(value.title, `${path}.title`);
  assertOptionalText(value.status, `${path}.status`);
  assertOptionalText(value.linkedDecisionId, `${path}.linkedDecisionId`);
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
    assertOptionalText(value.coverImage, 'meta.coverImage');
    assertOptionalText(value.coverAlt, 'meta.coverAlt');
    if (value.mood !== undefined) {
      assertStringArray(value.mood, 'meta.mood');
    }
    if (value.members !== undefined) {
      assertArray(value.members, 'meta.members');
      for (const [index, member] of value.members.entries()) {
        assert(isObject(member), `meta.members[${index}] must be an object.`);
        assertText(member.name, `meta.members[${index}].name`);
        assertOptionalText(member.role, `meta.members[${index}].role`);
      }
    }
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
    assertOptionalText(value.image, 'stay.image');
    assertStringArray(value.notes, 'stay.notes');
  }

  if (sectionKey === 'locations') {
    for (const location of value) {
      assertText(location.name, 'locations.name');
      assertText(location.area, 'locations.area');
      assertText(location.category, 'locations.category');
      assertText(location.mapQuery, 'locations.mapQuery');
      assertOptionalText(location.notes, 'locations.notes');
      assertOptionalText(location.image, 'locations.image');
      assertOptionalText(location.status, 'locations.status');
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
      assertOptionalText(attraction.image, 'attractions.image');
      assertBoolean(attraction.mustDo, 'attractions.mustDo');
    }
  }

  if (sectionKey === 'restaurants') {
    for (const restaurant of value) {
      assertText(restaurant.name, 'restaurants.name');
      assertText(restaurant.area, 'restaurants.area');
      assertText(restaurant.status, 'restaurants.status');
      assertText(restaurant.cuisine, 'restaurants.cuisine');
      assertText(restaurant.notes, 'restaurants.notes');
      assertOptionalText(restaurant.locationId, 'restaurants.locationId');
      assertOptionalText(restaurant.image, 'restaurants.image');
      assertOptionalText(restaurant.price, 'restaurants.price');
      assertOptionalText(restaurant.votes, 'restaurants.votes');
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
    validateTextOrObjectList(value.packing ?? [], 'planning.packing', validatePackingItem);
    if (value.budgetNotes !== undefined) {
      assertStringArray(value.budgetNotes, 'planning.budgetNotes');
    }
    validateTextOrObjectList(value.openQuestions ?? [], 'planning.openQuestions', validateQuestion);
    if (value.decisions !== undefined) {
      assertArray(value.decisions, 'planning.decisions');
      for (const [index, decision] of value.decisions.entries()) {
        validateDecision(decision, `planning.decisions[${index}]`);
      }
    }
    if (value.tasks !== undefined) {
      assertArray(value.tasks, 'planning.tasks');
      for (const [index, task] of value.tasks.entries()) {
        validateTask(task, `planning.tasks[${index}]`);
      }
    }
    if (value.budget !== undefined) {
      assert(isObject(value.budget), 'planning.budget must be an object.');
      assertOptionalText(value.budget.currency, 'planning.budget.currency');
      assertNumber(value.budget.target, 'planning.budget.target');
      assertOptionalText(value.budget.comfort, 'planning.budget.comfort');
      assertOptionalText(value.budget.notes, 'planning.budget.notes');
      assertArray(value.budget.expenses ?? [], 'planning.budget.expenses');
      for (const [index, expense] of (value.budget.expenses ?? []).entries()) {
        validateExpense(expense, `planning.budget.expenses[${index}]`);
      }
    }
    if (value.documents !== undefined) {
      assertArray(value.documents, 'planning.documents');
      for (const [index, document] of value.documents.entries()) {
        validateDocument(document, `planning.documents[${index}]`);
      }
    }
  }

  if (sectionKey === 'duringTrip') {
    assert(isObject(value), 'duringTrip must be an object.');
    if (value.wallet !== undefined) {
      assertStringArray(value.wallet, 'duringTrip.wallet');
    }
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
      assertOptionalText(day.date, `${day.id}.date`);
      assertOptionalText(day.isoDate, `${day.id}.isoDate`);
      assertOptionalText(day.destination, `${day.id}.destination`);
      assertOptionalText(day.mood, `${day.id}.mood`);
      assertOptionalText(day.balance, `${day.id}.balance`);
      assertOptionalText(day.balanceReason, `${day.id}.balanceReason`);
      if (Array.isArray(day.items)) {
        for (const [index, item] of day.items.entries()) {
          validateItineraryItem(item, `${day.id}.items[${index}]`);
        }
      } else {
        validatePeriod(day.morning, `${day.id}.morning`);
        validatePeriod(day.afternoon, `${day.id}.afternoon`);
        validatePeriod(day.evening, `${day.id}.evening`);
      }
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
    if (Array.isArray(day.items)) {
      for (const item of day.items) {
        if (item.locationId) {
          assert(locationIds.has(item.locationId), `Unknown location "${item.locationId}" in ${item.id}.`);
        }
      }
      continue;
    }

    for (const period of ['morning', 'afternoon', 'evening']) {
      for (const locationId of day[period]?.locationIds ?? []) {
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
