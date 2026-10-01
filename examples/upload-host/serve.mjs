import { createServer } from 'node:http';
import { Buffer } from 'node:buffer';
import { TextDecoder } from 'node:util';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';
import { createUploadHost, UploadHostError, uploadHostLimits } from './host.mjs';

const jsonLimit = 8192;
function json(res, status, value) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(value));
}
function parse(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > jsonLimit)
    throw new UploadHostError(413, 'Upload metadata exceeds its bound.');
  try {
    return JSON.parse(text);
  } catch {
    throw new UploadHostError(400, 'Invalid upload metadata JSON.');
  }
}
async function body(req, limit) {
  const declared = req.headers['content-length'];
  if (declared !== undefined && (!/^\d+$/.test(declared) || Number(declared) > limit))
    throw new UploadHostError(413, 'Request body exceeds its byte bound.');
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > limit) throw new UploadHostError(413, 'Request body exceeds its byte bound.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function jsonBody(req) {
  try {
    return parse(new TextDecoder('utf-8', { fatal: true }).decode(await body(req, jsonLimit)));
  } catch (error) {
    if (error instanceof UploadHostError) throw error;
    throw new UploadHostError(400, 'Upload JSON must be valid UTF-8.');
  }
}
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};
/** Returns an unstarted server. The caller starts and closes it. */
export function createUploadServer(host, options = {}) {
  const assets = resolve(options.assetsDirectory ?? 'examples/consumer/dist');
  let dropNextResponse = false;
  let disconnectResponse = false;
  const server = createServer(
    { maxHeaderSize: 20_000, requestTimeout: 10_000 },
    async (req, res) => {
      try {
        const address = server.address(),
          origin = `http://127.0.0.1:${address.port}`;
        if (
          req.headers.host !== `127.0.0.1:${address.port}` ||
          (req.headers.origin && req.headers.origin !== origin) ||
          req.headers['sec-fetch-site'] === 'cross-site'
        )
          throw new UploadHostError(403, 'Upload demo origin is unavailable.');
        if (!req.url || req.url.length > 20_000)
          throw new UploadHostError(413, 'Upload request URL exceeds its bound.');
        const url = new URL(req.url, origin);
        if (url.pathname.startsWith('/api/')) {
          if (req.method === 'GET') {
            if (url.pathname === '/api/uploads') return json(res, 200, await host.list());
            if (url.pathname === '/api/uploads/receipt')
              return json(res, 200, await host.lookup(parse(url.searchParams.get('original'))));
            const context = parse(url.searchParams.get('context'));
            if (url.pathname === '/api/uploads/checkpoint')
              return json(res, 200, await host.checkpoint(context));
            if (url.pathname === '/api/uploads/preview')
              return json(res, 200, await host.preview(context));
            if (url.pathname === '/api/uploads/content') {
              const original = await host.content(context);
              res.writeHead(200, {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': 'attachment; filename="attachment.bin"',
                'Content-Length': original.bytes.length,
                'Cache-Control': 'no-store',
                'X-Content-Type-Options': 'nosniff',
                'Content-Security-Policy': "default-src 'none'; sandbox",
              });
              res.end(original.bytes);
              return;
            }
            throw new UploadHostError(404, 'Upload read operation is unavailable.');
          }
          if (req.method !== 'POST' || req.headers.origin !== origin)
            throw new UploadHostError(405, 'Use same-origin POST upload requests.');
          let receipt;
          if (url.pathname === '/api/uploads/append') {
            if (req.headers['content-type'] !== 'application/octet-stream')
              throw new UploadHostError(415, 'Append requires raw octet-stream bytes.');
            let metadata;
            try {
              metadata = parse(decodeURIComponent(req.headers['x-upload-command']));
            } catch (error) {
              if (error instanceof UploadHostError) throw error;
              throw new UploadHostError(400, 'Invalid encoded chunk metadata.');
            }
            if (metadata?.operation !== 'append')
              throw new UploadHostError(400, 'Raw upload route requires append.');
            receipt = await host.command(metadata, await body(req, uploadHostLimits.chunkBytes));
          } else {
            if (req.headers['content-type'] !== 'application/json')
              throw new UploadHostError(415, 'Use finite JSON upload requests.');
            const input = await jsonBody(req);
            if (url.pathname === '/api/uploads/access')
              return json(res, 200, await host.setAccess(input));
            if (url.pathname === '/api/uploads/drop-response') {
              if (
                !input ||
                ![1, 2].includes(Object.keys(input).length) ||
                Object.keys(input).some((key) => !['enabled', 'disconnect'].includes(key)) ||
                typeof input.enabled !== 'boolean' ||
                (input.disconnect !== undefined && typeof input.disconnect !== 'boolean')
              )
                throw new UploadHostError(400, 'Invalid lost-response fixture.');
              dropNextResponse = input.enabled;
              disconnectResponse = input.disconnect === true;
              return json(res, 200, { enabled: dropNextResponse });
            }
            if (url.pathname !== '/api/uploads/command' || input?.operation === 'append')
              throw new UploadHostError(404, 'Upload mutation operation is unavailable.');
            receipt = await host.command(input);
          }
          // A lost acknowledgement is injected only after the host's atomic commit resolves.
          if (dropNextResponse && receipt.outcome === 'applied') {
            dropNextResponse = false;
            // Browsers may transparently retry a disconnected socket. The default
            // fixture withholds the original receipt with a finite 503 instead.
            if (disconnectResponse) res.destroy();
            else json(res, 503, { message: 'Original receipt unavailable after the disk commit.' });
            return;
          }
          json(res, 200, receipt);
          return;
        }
        if (req.method !== 'GET')
          throw new UploadHostError(405, 'Use GET for public consumer assets.');
        if (url.pathname === '/favicon.ico') {
          res.writeHead(204);
          res.end();
          return;
        }
        const pathname = decodeURIComponent(url.pathname),
          path = resolve(assets, `.${pathname === '/' ? '/index.html' : pathname}`);
        if (path !== assets && !path.startsWith(assets + sep))
          throw new UploadHostError(403, 'Public asset is unavailable.');
        if (!(await stat(path)).isFile())
          throw new UploadHostError(404, 'Public asset is unavailable.');
        res.writeHead(200, {
          'Content-Type': types[extname(path)] ?? 'application/octet-stream',
          'X-Content-Type-Options': 'nosniff',
        });
        res.end(await readFile(path));
      } catch (error) {
        if (res.destroyed) return;
        json(res, error instanceof UploadHostError ? error.status : 500, {
          message:
            error instanceof UploadHostError ? error.message : 'Local upload resource unavailable.',
        });
      }
    },
  );
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const host = await createUploadHost(
      resolve(process.env.AI_UPLOAD_STORE ?? 'output/upload-host-store'),
    ),
    server = createUploadServer(host);
  let closing = false;
  async function close() {
    if (closing) return;
    closing = true;
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
    await host.close();
  }
  process.on('SIGINT', close);
  process.on('SIGTERM', close);
  server.listen(4179, '127.0.0.1', () =>
    console.log('Bounded local upload host: http://127.0.0.1:4179'),
  );
}
