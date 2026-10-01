import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import console from 'node:console';
import { createFileHost, FileHostError } from './host.mjs';

const root = fileURLToPath(new URL('./workspace/', import.meta.url)),
  assets = resolve('examples/consumer/dist');
const host = await createFileHost(root, ['README.md', 'src/search.ts', 'tests/search.test.ts']);
const port = 4176,
  origin = `http://127.0.0.1:${port}`;
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
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};
const server = createServer(async (req, res) => {
  try {
    if (
      req.headers.host !== `127.0.0.1:${port}` ||
      (req.headers.origin && req.headers.origin !== origin)
    ) {
      json(res, 403, { message: 'Demo request origin is unavailable.' });
      return;
    }
    const url = new URL(req.url, origin);
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'GET' && url.pathname === '/api/files') {
        json(
          res,
          200,
          await host.window(
            Number(url.searchParams.get('pageIndex') ?? 0),
            Number(url.searchParams.get('pageSize') ?? 3),
          ),
        );
        return;
      }
      if (
        req.method !== 'POST' ||
        req.headers.origin !== origin ||
        req.headers['content-type'] !== 'application/json'
      ) {
        json(res, 405, { message: 'Use same-origin JSON demo requests.' });
        return;
      }
      let bytes = 0,
        body = '';
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 4096) throw new FileHostError(413, 'Opening request exceeds its bound.');
        body += chunk.toString('utf8');
      }
      let input;
      try {
        input = JSON.parse(body);
      } catch {
        throw new FileHostError(400, 'Invalid request JSON.');
      }
      if (url.pathname === '/api/files/open') {
        json(res, 200, await host.open(input));
        return;
      }
      if (
        url.pathname === '/api/access' &&
        input &&
        typeof input.authorized === 'boolean' &&
        Object.keys(input).length === 1
      ) {
        host.setAccess(input.authorized);
        json(res, 200, { authorized: input.authorized });
        return;
      }
      json(res, 404, { message: 'Demo operation not found.' });
      return;
    }
    if (req.method !== 'GET') {
      res.writeHead(405);
      res.end();
      return;
    }
    const pathname = decodeURIComponent(url.pathname),
      path = resolve(assets, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (path !== assets && !path.startsWith(assets + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (!(await stat(path)).isFile()) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': types[extname(path)] ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(await readFile(path));
  } catch (error) {
    json(res, error instanceof FileHostError ? error.status : 404, {
      message: error instanceof FileHostError ? error.message : 'Demo resource unavailable.',
    });
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Read-only sample files: ${origin}`));
