// EMBERWATCH: Night Shift — serve.ts
// Server HTTP statis kecil untuk direktori game (dev only).
// Node 22 stdlib saja. Port default 8080, atau --port N.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'game');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

let port = 8080;
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--port' && process.argv[i + 1]) {
    port = parseInt(process.argv[i + 1], 10);
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    if (path === '/') path = '/index.html';
    // Tolak path yang keluar dari root game.
    const full = normalize(join(root, path));
    if (full !== root && !full.startsWith(root + sep)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    const data = await readFile(full);
    res.writeHead(200, {
      'content-type': MIME[extname(full)] || 'application/octet-stream',
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(port, () => {
  console.log('Emberwatch serving game/ at http://localhost:' + port + '/');
});
