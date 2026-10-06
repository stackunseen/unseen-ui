// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { join, resolve, sep } from 'node:path';
import { request } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { inspectUploadReceipt } from '@stackunseen/ui-core/uploads';
import type { UploadCommand, UploadContext } from '@stackunseen/ui-core/uploads';
import { createUploadHost, uploadHostLimits } from './host.mjs';
import type { UploadHost } from './host.mjs';
import { createUploadServer } from './serve.mjs';

const base = resolve('output/upload-host-fixtures'),
  context: UploadContext = {
    workspaceId: 'demo-workspace',
    threadId: 'thread-demo',
    attachmentId: 'attachment-1',
    version: 'v1',
    uploadId: 'upload-1',
  },
  digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
let directory: string, host: UploadHost;
const servers = new Set<Server>();
function begin(
  sizeBytes = 5,
  ctx = context,
  commandId = 'begin',
  sha256 = digest(Buffer.from(sizeBytes ? 'hello' : '')),
): UploadCommand {
  return {
    commandId,
    context: ctx,
    expectedRevision: 0,
    operation: 'begin',
    file: { name: '../../untrusted <script>.txt', mediaType: 'text/plain', sizeBytes },
    sha256,
  };
}
function append(
  bytes: Uint8Array,
  expectedRevision = 1,
  offset = 0,
  commandId = 'append',
  ctx = context,
): UploadCommand {
  return {
    commandId,
    context: ctx,
    expectedRevision,
    operation: 'append',
    offset,
    byteLength: bytes.byteLength,
    sha256: digest(bytes),
  };
}
function complete(
  bytes: Uint8Array,
  expectedRevision = 2,
  ctx = context,
  commandId = 'complete',
): UploadCommand {
  return {
    commandId,
    context: ctx,
    expectedRevision,
    operation: 'complete',
    sha256: digest(bytes),
  };
}
async function ready(bytes = Buffer.from('hello')) {
  await host.command(begin(bytes.length, context, 'begin', digest(bytes)));
  if (bytes.length) await host.command(append(bytes), bytes);
  await host.command(complete(bytes, bytes.length ? 2 : 1));
}
async function listen() {
  const server = createUploadServer(host);
  servers.add(server);
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
async function post(origin: string, route: string, value: unknown) {
  return fetch(`${origin}${route}`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
}
beforeEach(async () => {
  await mkdir(base, { recursive: true });
  directory = await mkdtemp(join(base, 'run-'));
  host = await createUploadHost(directory);
});
afterEach(async () => {
  for (const server of servers) {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
  }
  servers.clear();
  await host.close();
  const target = resolve(directory);
  if (!target.startsWith(base + sep) || !target.slice(base.length + 1).startsWith('run-'))
    throw new Error('Cleanup target is outside the owned upload fixture directory.');
  await rm(target, { recursive: true, force: true });
});

describe('actual bounded upload disk host', () => {
  it('bounds pending operations rather than accumulating an unlimited serialized queue', async () => {
    const reads = Array.from({ length: uploadHostLimits.pendingOperations + 1 }, () => host.list());
    const outcomes = await Promise.allSettled(reads);
    expect(outcomes.filter((item) => item.status === 'fulfilled')).toHaveLength(
      uploadHostLimits.pendingOperations,
    );
    const overflow = outcomes.at(-1)!;
    expect(overflow.status).toBe('rejected');
    if (overflow.status === 'rejected') expect(overflow.reason.status).toBe(429);
    expect(host.diagnostics().committedWrites).toBe(0);
  });
  it('commits bytes, checkpoint and original receipt in one server-named record', async () => {
    const original = begin();
    await host.command(original);
    const chunk = Buffer.from('hello'),
      command = append(chunk),
      receipt = await host.command(command, chunk);
    expect(inspectUploadReceipt(receipt)).toEqual(receipt);
    const files = await readdir(directory);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^[a-f0-9-]{36}\.record\.json$/);
    const stored = JSON.parse(await readFile(join(directory, files[0]!), 'utf8'));
    expect(Buffer.from(stored.content, 'base64')).toEqual(chunk);
    expect(stored.checkpoint).toEqual(receipt.checkpoint);
    expect(stored.receipts[1]).toEqual(receipt);
    expect((await host.checkpoint(context)).state).toBe('uploading');
    await expect(host.content(context)).rejects.toMatchObject({ status: 409 });
  });
  it('resumes a committed offset across orderly restart and explicitly verifies completion', async () => {
    const first = Buffer.from('hel'),
      last = Buffer.from('lo'),
      original = append(first);
    await host.command(begin());
    await host.command(original, first);
    await host.close();
    host = await createUploadHost(directory);
    expect((await host.checkpoint(context)).receivedBytes).toBe(3);
    expect((await host.lookup(original)).outcome).toBe('applied');
    await host.command(append(last, 2, 3, 'last'), last);
    expect((await host.checkpoint(context)).state).toBe('uploading');
    await host.command(complete(Buffer.from('hello'), 3));
    expect((await host.content(context)).bytes.toString('utf8')).toBe('hello');
    expect((await host.list()).capabilities.resume).toBe('supported');
  });
  it('returns the immutable original receipt without another write, before and after restart', async () => {
    await host.command(begin());
    const bytes = Buffer.from('hello'),
      original = append(bytes),
      receipt = await host.command(original, bytes);
    const before = host.diagnostics().committedWrites;
    await host.command(complete(bytes));
    expect(await host.command(original, bytes)).toEqual(receipt);
    expect((await host.lookup(original)).checkpoint?.revision).toBe(2);
    expect((await host.checkpoint(context)).revision).toBe(3);
    expect(host.diagnostics().committedWrites).toBe(before + 1);
    await host.close();
    host = await createUploadHost(directory);
    expect(await host.command(original, bytes)).toEqual(receipt);
    expect(host.diagnostics().committedWrites).toBe(0);
  });
  it('rejects changed command identity/content without overwriting an original', async () => {
    await host.command(begin());
    const bytes = Buffer.from('hello'),
      original = append(bytes);
    const receipt = await host.command(original, bytes),
      writes = host.diagnostics().committedWrites;
    await expect(host.command({ ...original, expectedRevision: 2 }, bytes)).rejects.toMatchObject({
      status: 409,
    });
    await expect(
      host.lookup({ ...original, context: { ...context, version: 'v2' } }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(host.command(original, Buffer.from('other'))).rejects.toMatchObject({
      status: 400,
    });
    expect(await host.lookup(original)).toEqual(receipt);
    expect(host.diagnostics().committedWrites).toBe(writes);
  });
  it('serializes racing append revisions and retains a rejected original without projecting it', async () => {
    await host.command(begin());
    const bytes = Buffer.from('hello');
    const receipts = await Promise.all([
      host.command(append(bytes, 1, 0, 'race-a'), bytes),
      host.command(append(bytes, 1, 0, 'race-b'), bytes),
    ]);
    expect(receipts.map((r) => r.outcome)).toEqual(['applied', 'rejected']);
    expect((await host.checkpoint(context)).receivedBytes).toBe(5);
    const writes = host.diagnostics().committedWrites;
    expect(await host.command(receipts[1]!.command, bytes)).toEqual(receipts[1]);
    expect(host.diagnostics().committedWrites).toBe(writes);
  });
  it('rejects changed scope/version, unsafe requests and original-byte bounds', async () => {
    await expect(
      host.command(begin(5, { ...context, workspaceId: 'other' })),
    ).rejects.toMatchObject({ status: 403 });
    await expect(host.command(begin(uploadHostLimits.fileBytes + 1))).rejects.toMatchObject({
      status: 413,
    });
    const read = vi.fn(() => {
      throw new Error('Getter must not run.');
    });
    await expect(
      host.command(Object.defineProperty({}, 'context', { get: read })),
    ).rejects.toMatchObject({ status: 400 });
    expect(read).not.toHaveBeenCalled();
    await host.command(begin());
    await expect(host.checkpoint({ ...context, version: 'v2' })).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      host.command(begin(5, { ...context, uploadId: 'changed' }, 'changed')),
    ).rejects.toMatchObject({ status: 409 });
    const bytes = Buffer.alloc(uploadHostLimits.chunkBytes + 1);
    await expect(host.command(append(bytes), bytes)).rejects.toMatchObject({ status: 413 });
    expect((await host.checkpoint(context)).receivedBytes).toBe(0);
  });
  it('binds offset and full digest while keeping last-byte acknowledgement separate from ready', async () => {
    await host.command(begin());
    const bytes = Buffer.from('hello');
    expect((await host.command(append(bytes, 1, 1, 'wrong-offset'), bytes)).outcome).toBe(
      'rejected',
    );
    await host.command(append(bytes), bytes);
    expect((await host.checkpoint(context)).state).toBe('uploading');
    expect((await host.command(complete(Buffer.from('other')))).outcome).toBe('rejected');
    await host.command(complete(bytes, 2, context, 'correct-complete'));
    expect((await host.command(append(bytes, 3, 0, 'after-complete'), bytes)).outcome).toBe(
      'rejected',
    );
    expect((await host.content(context)).bytes).toEqual(bytes);
  });
  it('revokes bytes immediately while preserving historical originals and revision-bound restore', async () => {
    await ready();
    const original = begin(),
      receipt = await host.lookup(original);
    const revoked = await host.setAccess({ context, expectedRevision: 3, available: false });
    expect(revoked.revision).toBe(4);
    await expect(host.content(context)).rejects.toMatchObject({ status: 403 });
    await expect(host.preview(context)).rejects.toMatchObject({ status: 403 });
    expect(await host.lookup(original)).toEqual(receipt);
    expect(
      (
        await host.command({
          commandId: 'remove-denied',
          context,
          expectedRevision: 4,
          operation: 'remove',
        })
      ).outcome,
    ).toBe('rejected');
    await expect(
      host.setAccess({ context, expectedRevision: 3, available: true }),
    ).rejects.toMatchObject({ status: 409 });
    await host.setAccess({ context, expectedRevision: 4, available: true });
    expect((await host.content(context)).bytes.toString()).toBe('hello');
  });
  it.each(['cancel', 'remove'] as const)(
    'clears %s bytes while retaining historical offset and exact receipts',
    async (operation) => {
      await host.command(begin());
      const bytes = Buffer.from('hel'),
        original = append(bytes),
        receipt = await host.command(original, bytes);
      await host.command({ commandId: operation, context, expectedRevision: 2, operation });
      const current = await host.checkpoint(context);
      expect(current.receivedBytes).toBe(3);
      expect(current.state).toBe(operation === 'cancel' ? 'cancelled' : 'removed');
      if (operation === 'remove') expect(current.access).toBe('missing');
      const stored = JSON.parse(
        await readFile(join(directory, (await readdir(directory))[0]!), 'utf8'),
      );
      expect(stored.content).toBe('');
      await host.close();
      host = await createUploadHost(directory);
      expect(await host.lookup(original)).toEqual(receipt);
      await expect(host.content(context)).rejects.toMatchObject({
        status: operation === 'cancel' ? 409 : 403,
      });
    },
  );
  it('handles empty original content with explicit completion', async () => {
    await ready(Buffer.alloc(0));
    expect((await host.content(context)).bytes.length).toBe(0);
    expect((await host.checkpoint(context)).revision).toBe(2);
  });
  it('accepts a full 4MiB resource as exact 64KiB chunks and a verified complete checkpoint', async () => {
    const bytes = Buffer.alloc(uploadHostLimits.fileBytes, 65);
    await host.command(begin(bytes.length, context, 'begin', digest(bytes)));
    let revision = 1;
    for (let offset = 0; offset < bytes.length; offset += uploadHostLimits.chunkBytes) {
      const chunk = bytes.subarray(offset, offset + uploadHostLimits.chunkBytes);
      const receipt = await host.command(append(chunk, revision, offset, `chunk-${offset}`), chunk);
      expect(receipt.outcome).toBe('applied');
      revision++;
    }
    expect((await host.checkpoint(context)).state).toBe('uploading');
    await host.command(complete(bytes, revision));
    expect((await host.content(context)).bytes.equals(bytes)).toBe(true);
    await host.close();
    host = await createUploadHost(directory);
    expect((await host.checkpoint(context)).sha256).toBe(digest(bytes));
    expect((await host.content(context)).bytes.equals(bytes)).toBe(true);
  }, 30_000);
  it('rejects completing different content under the original immutable digest', async () => {
    await host.command(begin());
    const changed = Buffer.from('other');
    await host.command(append(changed), changed);
    expect((await host.command(complete(changed))).outcome).toBe('rejected');
    expect((await host.checkpoint(context)).sha256).toBe(digest(Buffer.from('hello')));
    expect((await host.checkpoint(context)).state).toBe('uploading');
  });
  it('rechecks preview access when revocation is queued during its read', async () => {
    await ready();
    const pending = host.preview(context);
    await host.setAccess({ context, expectedRevision: 3, available: false });
    await expect(pending).rejects.toMatchObject({ status: 403 });
  });
  it('bounds inert UTF-8 previews and rejects binary text while keeping original bytes', async () => {
    const text = '<script>never execute</script>' + 'x'.repeat(25_000);
    await ready(Buffer.from(text));
    const preview = await host.preview(context);
    expect(preview.text).toHaveLength(20_000);
    expect(preview.text.startsWith('<script>')).toBe(true);
    expect(preview.truncated).toBe(true);
    const binaryContext = { ...context, attachmentId: 'binary', uploadId: 'binary' },
      bytes = Buffer.from([255, 254]);
    await host.command(begin(2, binaryContext, 'binary-begin', digest(bytes)));
    await host.command(append(bytes, 1, 0, 'binary-append', binaryContext), bytes);
    await host.command(complete(bytes, 2, binaryContext, 'binary-complete'));
    await expect(host.preview(binaryContext)).rejects.toMatchObject({ status: 415 });
    expect((await host.content(binaryContext)).bytes).toEqual(bytes);
  });
  it('copies caller-owned chunk bytes before asynchronous I/O', async () => {
    await host.command(begin());
    const bytes = Buffer.from('hello'),
      pending = host.command(append(bytes), bytes);
    bytes.fill(0);
    await pending;
    await host.command(complete(Buffer.from('hello')));
    expect((await host.content(context)).bytes.toString()).toBe('hello');
  });
  it('pins read and lookup identities before caller-owned inputs change', async () => {
    await ready();
    const requested = { ...context },
      original = begin();
    const content = host.content(requested),
      preview = host.preview(requested),
      receipt = host.lookup(original);
    requested.version = 'changed';
    original.commandId = 'changed';
    expect((await content).checkpoint.context).toEqual(context);
    expect((await preview).checkpoint.context).toEqual(context);
    expect((await receipt).command.commandId).toBe('begin');
  });
  it('fails closed at eight retained tombstones', async () => {
    for (let i = 0; i < 8; i++) {
      const ctx = { ...context, attachmentId: `a-${i}`, uploadId: `u-${i}` };
      await host.command(begin(0, ctx, `b-${i}`));
      await host.command({
        commandId: `r-${i}`,
        context: ctx,
        expectedRevision: 1,
        operation: 'remove',
      });
    }
    await expect(
      host.command(begin(0, { ...context, uploadId: 'nine' }, 'nine')),
    ).rejects.toMatchObject({ status: 429 });
    expect((await host.list()).checkpoints).toHaveLength(8);
  });
  it('retains 256 originals across restart and fails closed without evicting or executing', async () => {
    await host.command(begin());
    const bytes = Buffer.from('hello');
    for (let i = 1; i < 256; i++) await host.command(append(bytes, 0, 0, `rejected-${i}`), bytes);
    const before = host.diagnostics().committedWrites;
    await expect(host.command(append(bytes), bytes)).rejects.toMatchObject({ status: 429 });
    expect(host.diagnostics().committedWrites).toBe(before);
    expect((await host.checkpoint(context)).receivedBytes).toBe(0);
    await host.close();
    host = await createUploadHost(directory);
    expect(host.diagnostics().receipts).toBe(256);
    expect((await host.lookup(begin())).outcome).toBe('applied');
    expect((await host.lookup(append(bytes))).outcome).toBe('not-found');
  }, 15_000);
  it('rejects malformed disk checkpoint/receipt records on restart', async () => {
    await host.command(begin());
    await host.close();
    const file = join(directory, (await readdir(directory))[0]!);
    const stored = JSON.parse(await readFile(file, 'utf8'));
    stored.checkpoint.receivedBytes = 4;
    await writeFile(file, JSON.stringify(stored));
    await expect(createUploadHost(directory)).rejects.toMatchObject({ status: 500 });
  });
});

describe('finite same-origin loopback upload HTTP', () => {
  it('withholds the committed original receipt with a deterministic finite 503 by default', async () => {
    const origin = await listen();
    await post(origin, '/api/uploads/drop-response', { enabled: true });
    expect((await post(origin, '/api/uploads/command', begin())).status).toBe(503);
    const writes = host.diagnostics().committedWrites;
    const response = await fetch(
      `${origin}/api/uploads/receipt?original=${encodeURIComponent(JSON.stringify(begin()))}`,
    );
    expect(inspectUploadReceipt(await response.json())?.outcome).toBe('applied');
    expect(host.diagnostics().committedWrites).toBe(writes);
  });
  it('drops only the next applied response after commit and lookup does not repeat writes', async () => {
    const origin = await listen();
    expect((await post(origin, '/api/uploads/command', begin())).status).toBe(200);
    await post(origin, '/api/uploads/drop-response', { enabled: true, disconnect: true });
    const bytes = Buffer.from('hello'),
      original = append(bytes);
    await expect(
      fetch(`${origin}/api/uploads/append`, {
        method: 'POST',
        headers: {
          Origin: origin,
          'Content-Type': 'application/octet-stream',
          'X-Upload-Command': encodeURIComponent(JSON.stringify(original)),
        },
        body: bytes,
      }),
    ).rejects.toThrow();
    const writes = host.diagnostics().committedWrites;
    const response = await fetch(
      `${origin}/api/uploads/receipt?original=${encodeURIComponent(JSON.stringify(original))}`,
    );
    const receipt = inspectUploadReceipt(await response.json());
    expect(receipt?.outcome).toBe('applied');
    expect(receipt?.checkpoint?.receivedBytes).toBe(5);
    expect(host.diagnostics().committedWrites).toBe(writes);
    const checkpoint = await fetch(
      `${origin}/api/uploads/checkpoint?context=${encodeURIComponent(JSON.stringify(context))}`,
    );
    expect((await checkpoint.json()).revision).toBe(2);
    expect((await post(origin, '/api/uploads/command', complete(bytes))).status).toBe(200);
  });
  it('enforces Host/Origin and raw/JSON bounds without committing', async () => {
    const origin = await listen();
    const denied = await fetch(`${origin}/api/uploads/command`, {
      method: 'POST',
      headers: { Origin: 'https://outside.invalid', 'Content-Type': 'application/json' },
      body: JSON.stringify(begin()),
    });
    expect(denied.status).toBe(403);
    const hostStatus = await new Promise<number | undefined>((done, fail) => {
      request(`${origin}/api/uploads`, { headers: { Host: 'outside.invalid' } }, (response) => {
        response.resume();
        response.on('end', () => done(response.statusCode));
      })
        .on('error', fail)
        .end();
    });
    expect(hostStatus).toBe(403);
    expect(
      (
        await fetch(`${origin}/api/uploads/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(begin()),
        })
      ).status,
    ).toBe(405);
    expect((await post(origin, '/api/uploads/command', { text: 'x'.repeat(8193) })).status).toBe(
      413,
    );
    const oversized = Buffer.alloc(uploadHostLimits.chunkBytes + 1);
    expect(
      (
        await fetch(`${origin}/api/uploads/append`, {
          method: 'POST',
          headers: {
            Origin: origin,
            'Content-Type': 'application/octet-stream',
            'X-Upload-Command': encodeURIComponent(JSON.stringify(append(oversized))),
          },
          body: oversized,
        })
      ).status,
    ).toBe(413);
    expect(host.diagnostics().committedWrites).toBe(0);
  });
  it('serves originals as attachments and makes preview/content unavailable on revocation', async () => {
    await ready();
    const origin = await listen(),
      query = encodeURIComponent(JSON.stringify(context));
    const response = await fetch(`${origin}/api/uploads/content?context=${query}`);
    expect(response.headers.get('content-type')).toBe('application/octet-stream');
    expect(response.headers.get('content-disposition')).toContain('attachment;');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(await response.text()).toBe('hello');
    const preview = await fetch(`${origin}/api/uploads/preview?context=${query}`);
    expect((await preview.json()).text).toBe('hello');
    await post(origin, '/api/uploads/access', { context, expectedRevision: 3, available: false });
    expect((await fetch(`${origin}/api/uploads/content?context=${query}`)).status).toBe(403);
    expect((await fetch(`${origin}/api/uploads/preview?context=${query}`)).status).toBe(403);
    expect(
      (
        await fetch(
          `${origin}/api/uploads/receipt?original=${encodeURIComponent(JSON.stringify(begin()))}`,
        )
      ).status,
    ).toBe(200);
  });
});
