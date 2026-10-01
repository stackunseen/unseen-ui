import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { URL } from 'node:url';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import console from 'node:console';
import { createPtyHost, PtyHostError } from './host.mjs';

const port = 4177,
  origin = `http://127.0.0.1:${port}`,
  assets = resolve('examples/consumer/dist');
const host = createPtyHost();
function json(res, status, value) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(value));
}
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
const server = createServer(async (req, res) => {
  try {
    if (
      req.headers.host !== `127.0.0.1:${port}` ||
      (req.headers.origin && req.headers.origin !== origin)
    )
      throw new PtyHostError(403, 'Demo request origin is unavailable.');
    const url = new URL(req.url, origin);
    if (req.method === 'GET' && url.pathname === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'GET' && url.pathname === '/api/terminal') {
        json(res, 200, host.snapshot());
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/terminal/receipt') {
        json(res, 200, host.receipt(url.searchParams.get('requestId')));
        return;
      }
      if (
        req.method !== 'POST' ||
        req.headers.origin !== origin ||
        req.headers['content-type'] !== 'application/json'
      )
        throw new PtyHostError(405, 'Use same-origin JSON demo requests.');
      let bytes = 0;
      const chunks = [];
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 8192) throw new PtyHostError(413, 'Terminal request exceeds its bound.');
        chunks.push(chunk);
      }
      let value;
      try {
        value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        throw new PtyHostError(400, 'Invalid terminal request JSON.');
      }
      const methods = {
        '/api/terminal/start': 'start',
        '/api/terminal/input': 'input',
        '/api/terminal/resize': 'resize',
        '/api/terminal/stop': 'stop',
        '/api/terminal/clear': 'clear',
      };
      const method = methods[url.pathname];
      if (method) {
        json(res, 200, host[method](value));
        return;
      }
      if (
        url.pathname === '/api/terminal/access' &&
        value &&
        typeof value.authorized === 'boolean' &&
        Object.keys(value).length === 1
      ) {
        json(res, 200, host.setAccess(value.authorized));
        return;
      }
      throw new PtyHostError(404, 'Demo operation unavailable.');
    }
    if (req.method !== 'GET') throw new PtyHostError(405, 'Use GET for public demo assets.');
    const pathname = decodeURIComponent(url.pathname);
    const path = resolve(assets, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (path !== assets && !path.startsWith(assets + sep))
      throw new PtyHostError(403, 'Asset unavailable.');
    if (!(await stat(path)).isFile()) throw new PtyHostError(404, 'Asset unavailable.');
    res.writeHead(200, {
      'Content-Type': types[extname(path)] ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(await readFile(path));
  } catch (error) {
    json(res, error instanceof PtyHostError ? error.status : 500, {
      message: error instanceof PtyHostError ? error.message : 'Public terminal demo unavailable.',
    });
  }
});
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  server.close();
  try {
    await host.close();
  } catch {
    console.error('Owned terminal exit could not be verified.');
    process.exitCode = 1;
  }
}
process.on('SIGINT', close);
process.on('SIGTERM', close);
server.listen(port, '127.0.0.1', () => console.log(`Fixed public PTY example: ${origin}`));
