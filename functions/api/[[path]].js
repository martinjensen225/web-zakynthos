import { clearSessionCookie, createSessionCookie, readSession, verifyEditor } from '../_lib/auth.js';
import {
  createTrip,
  deleteChecklistItem,
  deleteNote,
  deleteTrip,
  listTrips,
  readTrip,
  toggleFavorite,
  updateSection,
  upsertChecklistItem,
  upsertNote
} from '../_lib/db.js';
import { errorResponse, jsonResponse, methodNotAllowed, notFound, readJsonBody } from '../_lib/http.js';
import { validateChecklistItem, validateFullTrip, validateNote, validateSection, validateSectionKey } from '../_lib/validation.js';

async function requireEditor(request, env) {
  const editor = await readSession(request, env);
  if (!editor) {
    return { error: errorResponse(401, 'Editor login is required.') };
  }
  return { editor };
}

async function requireReadableTrip(request, env, tripId) {
  const editor = await readSession(request, env);
  if (env.PUBLIC_READ !== 'true' && !editor) {
    return { error: errorResponse(401, 'Login is required to read trip details.') };
  }

  const trip = await readTrip(env, tripId);
  if (!trip) {
    return { error: errorResponse(404, 'Trip not found.') };
  }

  return { trip, editor };
}

function routeParts(request) {
  const pathname = new URL(request.url).pathname.replace(/^\/api\/?/, '');
  return pathname ? pathname.split('/').map(decodeURIComponent) : [];
}

async function handleSession(request, env) {
  if (request.method !== 'GET') {
    return methodNotAllowed();
  }

  const editor = await readSession(request, env);
  return jsonResponse({ authenticated: Boolean(editor), editor });
}

async function handleLogin(request, env) {
  if (request.method !== 'POST') {
    return methodNotAllowed();
  }

  const { body, error } = await readJsonBody(request);
  if (error) {
    return error;
  }

  const username = String(body.username ?? '');
  const password = String(body.password ?? '');
  const editor = await verifyEditor(env, username, password);
  if (!editor) {
    return errorResponse(401, 'Invalid editor username or password.');
  }

  return jsonResponse(
    { authenticated: true, editor },
    { headers: { 'set-cookie': await createSessionCookie(env, editor) } }
  );
}

function handleLogout(request) {
  if (request.method !== 'POST') {
    return methodNotAllowed();
  }

  return jsonResponse({ authenticated: false }, { headers: { 'set-cookie': clearSessionCookie() } });
}

async function handleTrips(request, env) {
  const editor = await readSession(request, env);
  if (env.PUBLIC_READ !== 'true' && !editor) {
    return errorResponse(401, 'Login is required to read trips.');
  }

  if (request.method === 'GET') {
    return jsonResponse({ trips: await listTrips(env), authenticated: Boolean(editor), editor });
  }

  if (request.method === 'POST') {
    const { editor: requiredEditor, error: authError } = await requireEditor(request, env);
    if (authError) {
      return authError;
    }

    const { body, error } = await readJsonBody(request);
    if (error) {
      return error;
    }

    try {
      const trip = await createTrip(env, body, requiredEditor);
      validateFullTrip(trip);
      return jsonResponse({ trip, authenticated: true, editor: requiredEditor }, { status: 201 });
    } catch (createError) {
      return errorResponse(400, createError.message);
    }
  }

  return methodNotAllowed();
}

async function handleTrip(request, env, tripId) {
  if (request.method === 'GET') {
    const { trip, editor, error } = await requireReadableTrip(request, env, tripId);
    if (error) {
      return error;
    }
    validateFullTrip(trip);
    return jsonResponse({ trip, authenticated: Boolean(editor), editor });
  }

  if (request.method === 'PATCH') {
    const { editor, error: authError } = await requireEditor(request, env);
    if (authError) {
      return authError;
    }

    const { body, error } = await readJsonBody(request);
    if (error) {
      return error;
    }

    try {
      const currentTrip = await readTrip(env, tripId);
      if (!currentTrip) {
        return errorResponse(404, 'Trip not found.');
      }
      const nextMeta = { ...currentTrip.meta, ...body };
      validateSection('meta', nextMeta);
      validateFullTrip({ ...currentTrip, meta: nextMeta });
      const result = await updateSection(env, tripId, 'meta', nextMeta, currentTrip.versions.meta?.version, editor);
      const trip = await readTrip(env, tripId);
      return jsonResponse({ trip, result });
    } catch (updateError) {
      return errorResponse(400, updateError.message);
    }
  }

  if (request.method === 'DELETE') {
    const { error: authError } = await requireEditor(request, env);
    if (authError) {
      return authError;
    }
    const deleted = await deleteTrip(env, tripId);
    if (!deleted) {
      return errorResponse(404, 'Trip not found.');
    }
    return jsonResponse({ deleted: true });
  }

  return methodNotAllowed();
}

async function handleSection(request, env, tripId, sectionKey) {
  if (request.method !== 'PATCH') {
    return methodNotAllowed();
  }

  const { editor, error: authError } = await requireEditor(request, env);
  if (authError) {
    return authError;
  }

  const { body, error } = await readJsonBody(request);
  if (error) {
    return error;
  }

  try {
    validateSectionKey(sectionKey);
    validateSection(sectionKey, body.value);
    const currentTrip = await readTrip(env, tripId);
    if (!currentTrip) {
      return errorResponse(404, 'Trip not found.');
    }
    validateFullTrip({ ...currentTrip, [sectionKey]: body.value });
  } catch (validationError) {
    return errorResponse(400, validationError.message);
  }

  const result = await updateSection(env, tripId, sectionKey, body.value, body.version, editor);
  if (result.missing) {
    return errorResponse(404, 'Trip section not found.');
  }
  if (result.conflict) {
    return errorResponse(409, 'Trip section changed since this page loaded.', { currentVersion: result.currentVersion });
  }

  return jsonResponse(result);
}

async function handleNotes(request, env, tripId, noteId) {
  const { editor, error: authError } = await requireEditor(request, env);
  if (authError) {
    return authError;
  }

  if (request.method === 'POST' || request.method === 'PUT') {
    const { body, error } = await readJsonBody(request);
    if (error) {
      return error;
    }

    try {
      validateNote(body);
    } catch (validationError) {
      return errorResponse(400, validationError.message);
    }

    return jsonResponse(await upsertNote(env, tripId, noteId, body, editor));
  }

  if (request.method === 'DELETE' && noteId) {
    await deleteNote(env, tripId, noteId);
    return jsonResponse({ deleted: true });
  }

  return methodNotAllowed();
}

async function handleFavorite(request, env, tripId, targetId) {
  if (request.method !== 'PUT' && request.method !== 'DELETE') {
    return methodNotAllowed();
  }

  const { editor, error: authError } = await requireEditor(request, env);
  if (authError) {
    return authError;
  }

  if (!targetId) {
    return errorResponse(400, 'Favorite target id is required.');
  }

  return jsonResponse(await toggleFavorite(env, tripId, targetId, request.method === 'PUT', editor));
}

async function handleChecklistItem(request, env, tripId, itemId) {
  const { editor, error: authError } = await requireEditor(request, env);
  if (authError) {
    return authError;
  }

  if (request.method === 'POST' || request.method === 'PUT') {
    const { body, error } = await readJsonBody(request);
    if (error) {
      return error;
    }

    try {
      validateChecklistItem(body);
    } catch (validationError) {
      return errorResponse(400, validationError.message);
    }

    return jsonResponse(await upsertChecklistItem(env, tripId, itemId, body, editor));
  }

  if (request.method === 'DELETE' && itemId) {
    await deleteChecklistItem(env, tripId, itemId);
    return jsonResponse({ deleted: true });
  }

  return methodNotAllowed();
}

export async function onRequest(context) {
  try {
    const parts = routeParts(context.request);
    const [resource, tripId, child, grandchild] = parts;

    if (!resource || resource === 'session') {
      return handleSession(context.request, context.env);
    }
    if (resource === 'auth' && tripId === 'login') {
      return handleLogin(context.request, context.env);
    }
    if (resource === 'auth' && tripId === 'logout') {
      return handleLogout(context.request);
    }
    if (resource === 'trips' && !tripId) {
      return handleTrips(context.request, context.env);
    }
    if (resource === 'trips' && tripId && !child) {
      return handleTrip(context.request, context.env, tripId);
    }
    if (resource === 'trips' && tripId && child === 'sections' && grandchild) {
      return handleSection(context.request, context.env, tripId, grandchild);
    }
    if (resource === 'trips' && tripId && child === 'notes') {
      return handleNotes(context.request, context.env, tripId, grandchild);
    }
    if (resource === 'trips' && tripId && child === 'favorites') {
      return handleFavorite(context.request, context.env, tripId, grandchild);
    }
    if (resource === 'trips' && tripId && child === 'checklist-items') {
      return handleChecklistItem(context.request, context.env, tripId, grandchild);
    }

    return notFound();
  } catch (error) {
    console.error(error);
    return errorResponse(500, error.message || 'Unexpected server error.');
  }
}
