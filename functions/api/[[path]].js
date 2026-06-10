import { clearSessionCookie, createSessionCookie, readSession, verifyEditor } from '../_lib/auth.js';
import { deleteChecklistItem, deleteNote, readTrip, toggleFavorite, updateSection, upsertChecklistItem, upsertNote } from '../_lib/db.js';
import { errorResponse, jsonResponse, methodNotAllowed, notFound, readJsonBody } from '../_lib/http.js';
import { validateChecklistItem, validateFullTrip, validateNote, validateSection, validateSectionKey } from '../_lib/validation.js';

async function requireEditor(request, env) {
  const editor = await readSession(request, env);
  if (!editor) {
    return { error: errorResponse(401, 'Editor login is required.') };
  }
  return { editor };
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

async function handleTrip(request, env) {
  if (request.method !== 'GET') {
    return methodNotAllowed();
  }

  const editor = await readSession(request, env);
  if (env.PUBLIC_READ !== 'true' && !editor) {
    return errorResponse(401, 'Login is required to read trip details.');
  }

  const trip = await readTrip(env);
  validateFullTrip(trip);
  return jsonResponse({ trip, authenticated: Boolean(editor), editor });
}

async function handleSection(request, env, sectionKey) {
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
  } catch (validationError) {
    return errorResponse(400, validationError.message);
  }

  const result = await updateSection(env, sectionKey, body.value, body.version, editor);
  if (result.missing) {
    return errorResponse(404, 'Trip section not found.');
  }
  if (result.conflict) {
    return errorResponse(409, 'Trip section changed since this page loaded.', { currentVersion: result.currentVersion });
  }

  return jsonResponse(result);
}

async function handleNotes(request, env, noteId) {
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

    return jsonResponse(await upsertNote(env, noteId, body, editor));
  }

  if (request.method === 'DELETE' && noteId) {
    await deleteNote(env, noteId);
    return jsonResponse({ deleted: true });
  }

  return methodNotAllowed();
}

async function handleFavorite(request, env, targetId) {
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

  return jsonResponse(await toggleFavorite(env, targetId, request.method === 'PUT', editor));
}

async function handleChecklistItem(request, env, itemId) {
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

    return jsonResponse(await upsertChecklistItem(env, itemId, body, editor));
  }

  if (request.method === 'DELETE' && itemId) {
    await deleteChecklistItem(env, itemId);
    return jsonResponse({ deleted: true });
  }

  return methodNotAllowed();
}

export async function onRequest(context) {
  try {
    const parts = routeParts(context.request);
    const [resource, child, grandchild] = parts;

    if (!resource || resource === 'session') {
      return handleSession(context.request, context.env);
    }
    if (resource === 'auth' && child === 'login') {
      return handleLogin(context.request, context.env);
    }
    if (resource === 'auth' && child === 'logout') {
      return handleLogout(context.request);
    }
    if (resource === 'trip' && !child) {
      return handleTrip(context.request, context.env);
    }
    if (resource === 'trip' && child === 'sections' && grandchild) {
      return handleSection(context.request, context.env, grandchild);
    }
    if (resource === 'notes') {
      return handleNotes(context.request, context.env, child);
    }
    if (resource === 'favorites') {
      return handleFavorite(context.request, context.env, child);
    }
    if (resource === 'checklist-items') {
      return handleChecklistItem(context.request, context.env, child);
    }

    return notFound();
  } catch (error) {
    console.error(error);
    return errorResponse(500, error.message || 'Unexpected server error.');
  }
}
