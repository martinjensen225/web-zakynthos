import { webcrypto } from 'node:crypto';

const [, , username, password, salt = username] = process.argv;

if (!username || !password) {
  console.error('Usage: node scripts/hash-editor-password.mjs <username> <password> [salt]');
  process.exit(1);
}

const encoder = new TextEncoder();
const digest = await webcrypto.subtle.digest('SHA-256', encoder.encode(`${salt}:${password}`));
const bytes = new Uint8Array(digest);
const passwordHash = Buffer.from(bytes).toString('base64url');

console.log(JSON.stringify([{ username, displayName: username, salt, passwordHash }], null, 2));
