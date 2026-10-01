import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL, URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.vtt': 'text/vtt; charset=utf-8',
};
export function createDocsServer(directory = 'apps/docs/out') {
  const root = resolve(directory);
  return createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let path = resolve(root, `.${pathname}`);
      if (path !== root && !path.startsWith(root + sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      try {
        if ((await stat(path)).isDirectory()) {
          const directory = path;
          path = resolve(directory, 'index.html');
          try {
            await stat(path);
          } catch {
            path = `${directory}.html`;
          }
        }
      } catch {
        if (!extname(path)) path += '.html';
      }
      const body = await readFile(path);
      res.writeHead(200, {
        'Content-Type': types[extname(path)] ?? 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const server = createDocsServer();
  server.listen(Number(process.env.PORT ?? 4173), '127.0.0.1', () =>
    console.log(`Gallery: http://127.0.0.1:${server.address().port}`),
  );
}
