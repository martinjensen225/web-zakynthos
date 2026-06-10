const maxJsonBytes = 150_000;

export function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers ?? {})
    }
  });
}

export function errorResponse(status, message, details = undefined) {
  return jsonResponse({ error: { message, details } }, { status });
}

export async function readJsonBody(request) {
  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > maxJsonBytes) {
    return { error: errorResponse(413, 'Request body is too large.') };
  }

  try {
    return { body: await request.json() };
  } catch {
    return { error: errorResponse(400, 'Request body must be valid JSON.') };
  }
}

export function methodNotAllowed() {
  return errorResponse(405, 'Method not allowed.');
}

export function notFound() {
  return errorResponse(404, 'API route not found.');
}
