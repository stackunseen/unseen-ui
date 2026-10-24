import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath, URL, URLSearchParams } from 'node:url';
import process from 'node:process';
import console from 'node:console';

const root = fileURLToPath(new URL('../out/', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === '/' && (url.searchParams.has('view') || url.searchParams.has('component'))) {
      const routes = JSON.parse(await readFile(resolve(root, 'gallery-routes.json'), 'utf8'));
      const component = url.searchParams.get('component');
      const view = url.searchParams.get('view');
      let destination =
        view && view !== 'components'
          ? routes.views[view]
          : component
            ? routes.components[component]
            : '/components/';
      destination ??= '/components/';
      const selection = new URLSearchParams();
      if (destination.startsWith('/components/') && component)
        for (const key of ['style', 'state', 'tab', 'compare'])
          if (url.searchParams.has(key)) selection.set(key, url.searchParams.get(key));
      if (selection.size) destination += `?${selection}`;
      res.writeHead(308, { Location: destination });
      res.end();
      return;
    }
    if (!pathname.endsWith('/') && !extname(pathname)) {
      res.writeHead(308, { Location: `${url.pathname}/${url.search}` });
      res.end();
      return;
    }
    let path = resolve(root, `.${pathname}`);
    if (path !== resolve(root) && !path.startsWith(resolve(root) + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    const body = await readFile(path);
    res.writeHead(200, {
      'Content-Type': types[extname(path)] ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(body);
  } catch {
    const body = await readFile(resolve(root, '404.html')).catch(() => 'Page not found');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(body);
  }
});
server.listen(Number(process.env.PORT ?? 4175), '127.0.0.1', () =>
  console.log(`Unseen UI: http://127.0.0.1:${server.address().port}`),
);
