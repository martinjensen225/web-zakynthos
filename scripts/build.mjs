import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

await import('./validate.mjs');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const entries = ['assets', 'content', 'data', 'public', 'index.html', 'itinerary.html', 'attractions.html', 'stay.html', 'food.html', 'map.html', 'planning.html', 'guide.html'];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const entry of entries) {
  await cp(path.join(root, entry), path.join(dist, entry), { recursive: true });
}

const files = await readdir(dist);
console.log(`Build complete. Wrote ${files.length} top-level entries to dist/.`);
