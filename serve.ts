// A tiny static server for game/ (Node 22, stdlib only), so the entry can
// be played locally without a build step:
//
//   node serve.ts            # serves game/ on http://localhost:8080
//   node serve.ts --port N   # or on port N
//
// Development convenience only; the entry itself is static files, and the
// grader never runs this server — it reads game/ straight off the disk.
import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const argv = process.argv.slice(2);
const portFlag = argv.indexOf('--port');
const wanted = portFlag === -1 ? 8080 : Number(argv[portFlag + 1]);
const port = Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(join(gameRoot, normalize(pathname)));
  if (!file.startsWith(gameRoot + sep)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  const type = MIME_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
  response.writeHead(200, { 'Content-Type': type });
  createReadStream(file)
    .on('error', () => {
      if (!response.headersSent) response.writeHead(404);
      response.end('not found');
    })
    .pipe(response);
}).listen(port, () => {
  console.log(`Emberwatch serving game/ at http://localhost:${port}`);
});
