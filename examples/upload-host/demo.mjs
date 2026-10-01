import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import console from 'node:console';
import { createUploadHost } from './host.mjs';
import { createUploadServer } from './serve.mjs';

const base = resolve('output/upload-host-demo');
await mkdir(base, { recursive: true });
const directory = await mkdtemp(join(base, 'run-')),
  sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex'),
  bytes = Buffer.from('Actual disk upload, resumed after restart.\n'),
  first = bytes.subarray(0, 7),
  context = {
    workspaceId: 'demo-workspace',
    threadId: 'thread-demo',
    attachmentId: 'demo-attachment',
    version: 'original-v1',
    uploadId: 'demo-upload',
  },
  begin = {
    commandId: 'demo-begin',
    context,
    expectedRevision: 0,
    operation: 'begin',
    file: { name: 'public-demo.txt', mediaType: 'text/plain', sizeBytes: bytes.length },
    sha256: sha256(bytes),
  },
  original = {
    commandId: 'demo-original-chunk',
    context,
    expectedRevision: 1,
    operation: 'append',
    offset: 0,
    byteLength: first.length,
    sha256: sha256(first),
  };
let host = await createUploadHost(directory),
  server;
async function removeOwnedFixture() {
  const target = resolve(directory);
  if (!target.startsWith(base + sep) || !target.slice(base.length + 1).startsWith('run-'))
    throw new Error('Demo cleanup target is outside its owned output directory.');
  await rm(target, { recursive: true, force: true });
}
try {
  server = createUploadServer(host);
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const origin = `http://127.0.0.1:${server.address().port}`,
    post = (route, value) =>
      globalThis.fetch(`${origin}${route}`, {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      });
  if (!(await post('/api/uploads/command', begin)).ok) throw new Error('Begin was not accepted.');
  await post('/api/uploads/drop-response', { enabled: true, disconnect: true });
  let responseLost = false;
  try {
    await globalThis.fetch(`${origin}/api/uploads/append`, {
      method: 'POST',
      headers: {
        Origin: origin,
        'Content-Type': 'application/octet-stream',
        'X-Upload-Command': encodeURIComponent(JSON.stringify(original)),
      },
      body: first,
    });
  } catch {
    responseLost = true;
  }
  if (!responseLost) throw new Error('Lost-response fixture did not run.');
  const writes = host.diagnostics().committedWrites,
    receipt = await (
      await globalThis.fetch(
        `${origin}/api/uploads/receipt?original=${encodeURIComponent(JSON.stringify(original))}`,
      )
    ).json(),
    lookupDidNotWrite = host.diagnostics().committedWrites === writes;
  if (receipt.outcome !== 'applied' || !lookupDidNotWrite)
    throw new Error('Original receipt did not confirm the committed chunk.');
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
  server = undefined;
  await host.close();
  host = await createUploadHost(directory);
  const resumed = await host.checkpoint(context),
    rest = bytes.subarray(resumed.receivedBytes);
  await host.command(
    {
      commandId: 'demo-rest',
      context,
      expectedRevision: resumed.revision,
      operation: 'append',
      offset: resumed.receivedBytes,
      byteLength: rest.length,
      sha256: sha256(rest),
    },
    rest,
  );
  await host.command({
    commandId: 'demo-complete',
    context,
    expectedRevision: resumed.revision + 1,
    operation: 'complete',
    sha256: sha256(bytes),
  });
  const content = await host.content(context);
  if (!content.bytes.equals(bytes)) throw new Error('Original content did not survive resume.');
  console.log(
    JSON.stringify(
      {
        responseLostAfterCommit: responseLost,
        originalReceipt: receipt.outcome,
        lookupDidNotWrite,
        restartOffset: resumed.receivedBytes,
        completeSize: content.bytes.length,
        originalBytesMatch: true,
        actualDiskRecords: host.diagnostics().resources,
        listener: 'finite ephemeral loopback, closed',
        crashDurability: 'not verified; no fsync',
      },
      null,
      2,
    ),
  );
} finally {
  if (server) {
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
  }
  await host.close();
  await removeOwnedFixture();
}
