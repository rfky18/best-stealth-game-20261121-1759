// serve.ts — tiny static server for game/ (Node 22 stdlib only).
// Usage: node serve.ts [--port 8080]

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

const args = process.argv.slice(2);
let port = 8080;
const pi = args.indexOf('--port');
if (pi >= 0 && args[pi + 1]) port = Number(args[pi + 1]) || 8080;

const root = join(process.cwd(), 'game');
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

const server = createServer((req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const file = normalize(join(root, rel));
    if (!file.startsWith(root + '/') && file !== root) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(500);
    res.end('error');
  }
});

server.listen(port, () => {
  console.log(`serving game/ at http://localhost:${port}`);
});
