// Emberwatch: Night Shift — static file server for local play.
// Node 22 standard library only. Serves game/ on port 8080 unless
// --port is given. Paths that escape the game root are refused.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(join(fileURLToPath(new URL('.', import.meta.url)), 'game'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
};

function portFromArgs() {
  const idx = process.argv.indexOf('--port');
  if (idx >= 0 && process.argv[idx + 1]) {
    const p = Number(process.argv[idx + 1]);
    if (Number.isInteger(p) && p > 0 && p < 65536) return p;
  }
  return 8080;
}

const server = createServer(async (req, res) => {
  try {
    const raw = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
    let rel = normalize(raw).replace(/^[/\\]+/, '');
    if (rel === '') rel = 'index.html';
    const file = resolve(join(ROOT, rel));
    if (!file.startsWith(ROOT + sep) && file !== ROOT) {
      res.writeHead(403, { 'content-type': 'text/plain' });
      res.end('forbidden');
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(body);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
    } else {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('server error');
    }
  }
});

const port = portFromArgs();
server.listen(port, () => {
  console.log(`Emberwatch serving game/ at http://localhost:${port}`);
});
