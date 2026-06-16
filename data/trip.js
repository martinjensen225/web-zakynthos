async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers ?? {})
    },
    ...options
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.error?.message ?? `Request failed: ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.details = payload.error?.details;
    throw error;
  }

  return payload;
}

function tripPath(tripId, suffix = '') {
  return `/api/trips/${encodeURIComponent(tripId)}${suffix}`;
}

export async function loadTrips() {
  return requestJson('/api/trips');
}

export async function createTrip(value) {
  return requestJson('/api/trips', {
    method: 'POST',
    body: JSON.stringify(value)
  });
}

export async function updateTrip(tripId, value) {
  return requestJson(tripPath(tripId), {
    method: 'PATCH',
    body: JSON.stringify(value)
  });
}

export async function removeTrip(tripId) {
  return requestJson(tripPath(tripId), { method: 'DELETE' });
}

export async function loadTrip(tripId) {
  return requestJson(tripPath(tripId));
}

export async function getSession() {
  return requestJson('/api/session');
}

export async function login(username, password) {
  return requestJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export async function logout() {
  return requestJson('/api/auth/logout', { method: 'POST' });
}

export async function saveSection(tripId, sectionKey, value, version) {
  return requestJson(tripPath(tripId, `/sections/${encodeURIComponent(sectionKey)}`), {
    method: 'PATCH',
    body: JSON.stringify({ value, version })
  });
}

export async function saveNote(tripId, note) {
  const method = note.id ? 'PUT' : 'POST';
  const path = note.id
    ? tripPath(tripId, `/notes/${encodeURIComponent(note.id)}`)
    : tripPath(tripId, '/notes');
  return requestJson(path, {
    method,
    body: JSON.stringify({ targetId: note.targetId, body: note.body })
  });
}

export async function deleteNote(tripId, id) {
  return requestJson(tripPath(tripId, `/notes/${encodeURIComponent(id)}`), { method: 'DELETE' });
}

export async function setFavorite(tripId, targetId, favorite) {
  return requestJson(tripPath(tripId, `/favorites/${encodeURIComponent(targetId)}`), {
    method: favorite ? 'PUT' : 'DELETE'
  });
}

export async function saveChecklistItem(tripId, item) {
  const method = item.id ? 'PUT' : 'POST';
  const path = item.id
    ? tripPath(tripId, `/checklist-items/${encodeURIComponent(item.id)}`)
    : tripPath(tripId, '/checklist-items');
  return requestJson(path, {
    method,
    body: JSON.stringify(item)
  });
}

export async function deleteChecklistItem(tripId, id) {
  return requestJson(tripPath(tripId, `/checklist-items/${encodeURIComponent(id)}`), { method: 'DELETE' });
}
