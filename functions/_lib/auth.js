const encoder = new TextEncoder();
const sessionCookie = 'zakynthos_session';
const oneWeekSeconds = 60 * 60 * 24 * 7;

function fail(message) {
  throw new Error(message);
}

function base64Url(bytes) {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlJson(value) {
  return base64Url(encoder.encode(JSON.stringify(value)));
}

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function readCookie(request, name) {
  const header = request.headers.get('cookie') ?? '';
  return header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return base64Url(new Uint8Array(digest));
}

export function sessionCookieName() {
  return sessionCookie;
}

export function readEditorUsers(env) {
  if (!env.EDITOR_USERS_JSON) {
    fail('EDITOR_USERS_JSON is required.');
  }

  const users = JSON.parse(env.EDITOR_USERS_JSON);
  if (!Array.isArray(users) || users.length === 0) {
    fail('EDITOR_USERS_JSON must contain at least one editor user.');
  }

  return users.map((user) => {
    if (!user.username || !user.passwordHash) {
      fail('Each editor user needs username and passwordHash.');
    }
    return user;
  });
}

export async function hashPassword(password, salt) {
  return sha256(`${salt}:${password}`);
}

export async function verifyEditor(env, username, password) {
  const users = readEditorUsers(env);
  const user = users.find((candidate) => candidate.username === username);
  if (!user) {
    return null;
  }

  const actualHash = await hashPassword(password, user.salt ?? username);
  if (!timingSafeEqual(actualHash, user.passwordHash)) {
    return null;
  }

  return { username: user.username, displayName: user.displayName ?? user.username };
}

export async function createSessionCookie(env, editor) {
  if (!env.SESSION_SECRET) {
    fail('SESSION_SECRET is required.');
  }

  const payload = {
    username: editor.username,
    displayName: editor.displayName,
    expiresAt: Date.now() + oneWeekSeconds * 1000
  };
  const encodedPayload = base64UrlJson(payload);
  const signature = await hmac(env.SESSION_SECRET, encodedPayload);
  return `${sessionCookie}=${encodedPayload}.${signature}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${oneWeekSeconds}`;
}

export function clearSessionCookie() {
  return `${sessionCookie}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function readSession(request, env) {
  if (!env.SESSION_SECRET) {
    fail('SESSION_SECRET is required.');
  }

  const cookieValue = readCookie(request, sessionCookie);
  if (!cookieValue) {
    return null;
  }

  const [encodedPayload, signature] = cookieValue.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = await hmac(env.SESSION_SECRET, encodedPayload);
  if (!timingSafeEqual(signature, expectedSignature)) {
    return null;
  }

  const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedPayload)));
  if (!payload.expiresAt || payload.expiresAt < Date.now()) {
    return null;
  }

  return { username: payload.username, displayName: payload.displayName ?? payload.username };
}
