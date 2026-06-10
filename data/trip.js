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

export async function loadTrip() {
  return requestJson('/api/trip');
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

export async function saveSection(sectionKey, value, version) {
  return requestJson(`/api/trip/sections/${encodeURIComponent(sectionKey)}`, {
    method: 'PATCH',
    body: JSON.stringify({ value, version })
  });
}

export async function saveNote(note) {
  const method = note.id ? 'PUT' : 'POST';
  const path = note.id ? `/api/notes/${encodeURIComponent(note.id)}` : '/api/notes';
  return requestJson(path, {
    method,
    body: JSON.stringify({ targetId: note.targetId, body: note.body })
  });
}

export async function deleteNote(id) {
  return requestJson(`/api/notes/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function setFavorite(targetId, favorite) {
  return requestJson(`/api/favorites/${encodeURIComponent(targetId)}`, {
    method: favorite ? 'PUT' : 'DELETE'
  });
}

export async function saveChecklistItem(item) {
  const method = item.id ? 'PUT' : 'POST';
  const path = item.id ? `/api/checklist-items/${encodeURIComponent(item.id)}` : '/api/checklist-items';
  return requestJson(path, {
    method,
    body: JSON.stringify(item)
  });
}

export async function deleteChecklistItem(id) {
  return requestJson(`/api/checklist-items/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
