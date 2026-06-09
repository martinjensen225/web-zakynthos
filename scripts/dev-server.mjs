import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serveRoot = process.argv[2] ? path.resolve(root, process.argv[2]) : root;
const port = Number(process.env.PORT ?? 4321);
const types = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml']
]);

function resolveRequestPath(url) {
  const requestPath = decodeURIComponent(new URL(url, `http://127.0.0.1:${port}`).pathname);
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  return path.resolve(serveRoot, relativePath);
}

const server = createServer(async (request, response) => {
  try {
    const filePath = resolveRequestPath(request.url ?? '/');
    if (!filePath.startsWith(serveRoot)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    await access(filePath);
    const stats = await stat(filePath);
    const finalPath = stats.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    response.writeHead(200, { 'content-type': types.get(path.extname(finalPath)) ?? 'application/octet-stream' });
    createReadStream(finalPath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving ${serveRoot} at http://127.0.0.1:${port}/`);
});
