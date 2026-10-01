// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createUploadHost } from '../../../upload-host/host.mjs';
import { createUploadClient } from './client';
import type { UploadCommand } from '@ai-interaction/core/uploads';
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});
async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'upload-client-'));
  const host = await createUploadHost(directory);
  let lose = false,
    corrupt = false;
  let serial = 0;
  const sent: UploadCommand[] = [];
  const request: typeof fetch = async (input, init) => {
    const url = new URL(String(input), 'http://127.0.0.1');
    let result: unknown;
    if (url.pathname === '/api/uploads') result = await host.list();
    else if (url.pathname.endsWith('/checkpoint'))
      result = await host.checkpoint(JSON.parse(url.searchParams.get('context')!));
    else if (url.pathname.endsWith('/receipt'))
      result = await host.lookup(JSON.parse(url.searchParams.get('original')!));
    else if (url.pathname.endsWith('/preview'))
      result = await host.preview(JSON.parse(url.searchParams.get('context')!));
    else if (url.pathname.endsWith('/access'))
      result = await host.setAccess(JSON.parse(String(init?.body)));
    else if (url.pathname.endsWith('/drop-response')) {
      lose = true;
      result = { enabled: true };
    } else {
      const command: UploadCommand = url.pathname.endsWith('/append')
        ? JSON.parse(decodeURIComponent(new Headers(init?.headers).get('X-Upload-Command')!))
        : JSON.parse(String(init?.body));
      sent.push(command);
      const receipt = await host.command(
        command,
        init?.body instanceof ArrayBuffer ? new Uint8Array(init.body) : undefined,
      );
      if (lose && receipt.outcome === 'applied') {
        lose = false;
        throw new Error('Lost after commit');
      }
      result = corrupt ? { ...receipt, command: { ...command, commandId: 'different' } } : receipt;
    }
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const client = createUploadClient({
    fetch: request,
    id: () => `id-${++serial}`,
    digest: async (bytes) => createHash('sha256').update(bytes).digest('hex'),
  });
  cleanups.push(async () => {
    client.dispose();
    await host.close();
    await rm(directory, { recursive: true });
  });
  await client.connect();
  return {
    client,
    host,
    sent,
    corrupt() {
      corrupt = true;
    },
  };
}
describe('browser upload owner with actual bounded disk host', () => {
  it('aborts a bounded transport deadline and releases the read owner', async () => {
    let aborted = false;
    const client = createUploadClient({
      timeoutMs: 5,
      fetch: async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => {
              aborted = true;
              reject(new Error('Aborted'));
            },
            { once: true },
          );
        }),
    });
    await client.connect();
    expect(aborted).toBe(true);
    expect(client.getSnapshot().busy).toBe(false);
    expect(client.getSnapshot().connected).toBe(false);
    client.dispose();
  });
  it('selects locally, accepts sequential chunks and explicit final digest before preview', async () => {
    const { client, host, sent } = await fixture();
    await client.select(new File(['hello checkpoint'], 'notes.txt', { type: 'text/plain' }));
    expect(host.diagnostics().resources).toBe(0);
    expect(client.getSnapshot().value?.state).toBe('selected');
    await client.transfer();
    expect(sent.map((c) => c.operation)).toEqual(['begin', 'append', 'complete']);
    expect(client.getSnapshot().value?.state).toBe('ready');
    expect(client.getSnapshot().value?.receivedBytes).toBe(16);
    await client.preview();
    expect(client.getSnapshot().preview).toBe('hello checkpoint');
  });
  it('refresh preserves unknown original; lookup settles historical receipt without redispatch', async () => {
    const { client, host, sent } = await fixture();
    await client.select(new File(['resume content'], 'notes.txt', { type: 'text/plain' }));
    await client.loseNextResponse();
    await client.transfer();
    const original = client.getSnapshot().operation!.command;
    expect(client.getSnapshot().operation?.state).toBe('outcome-unknown');
    expect(sent).toHaveLength(1);
    await client.select(new File(['different'], 'other.txt'));
    await client.transfer();
    await client.mutate('remove');
    expect(sent).toHaveLength(1);
    await host.setAccess({ context: original.context, expectedRevision: 1, available: false });
    await client.refresh();
    expect(client.getSnapshot().value?.revision).toBe(2);
    expect(client.getSnapshot().operation?.state).toBe('outcome-unknown');
    await client.lookup(original);
    expect(sent).toHaveLength(1);
    expect(client.getSnapshot().operation).toBeUndefined();
    expect(client.getSnapshot().value?.revision).toBe(2);
    expect(client.getSnapshot().value?.access).toBe('revoked');
    await client.setAccess(true);
    await client.transfer();
    expect(client.getSnapshot().value?.state).toBe('ready');
    expect(sent.filter((c) => c.operation === 'begin')).toHaveLength(1);
  });
  it('pauses after a committed append; resumes from that exact offset', async () => {
    const { client, sent } = await fixture();
    await client.select(new File([new Uint8Array(130_000)], 'large.bin'));
    const unsubscribe = client.subscribe(() => {
      if (client.getSnapshot().operation?.command.operation === 'append') client.pause();
    });
    await client.transfer();
    unsubscribe();
    expect(client.getSnapshot().paused).toBe(true);
    expect(client.getSnapshot().value?.receivedBytes).toBe(65_536);
    expect(client.getSnapshot().value?.state).toBe('uploading');
    await client.transfer();
    expect(
      sent.filter((c) => c.operation === 'append').map((c) => c.operation === 'append' && c.offset),
    ).toEqual([0, 65_536]);
    expect(client.getSnapshot().value?.state).toBe('ready');
  });
  it('reconciles lost append, then continues without duplicating committed bytes', async () => {
    const { client, sent } = await fixture();
    await client.select(new File([new Uint8Array(130_000)], 'large.bin'));
    const unsubscribe = client.subscribe(() => {
      if (client.getSnapshot().operation?.command.operation === 'begin') client.pause();
    });
    await client.transfer();
    unsubscribe();
    await client.loseNextResponse();
    await client.transfer();
    const original = client.getSnapshot().operation!.command;
    expect(original.operation).toBe('append');
    await client.lookup(original);
    await client.transfer();
    expect(
      sent.filter((c) => c.operation === 'append').map((c) => c.operation === 'append' && c.offset),
    ).toEqual([0, 65_536]);
    expect(client.getSnapshot().value?.state).toBe('ready');
  });
  it('cancel and remove are acknowledged host operations; access loss clears preview', async () => {
    const { client, host } = await fixture();
    await client.select(new File(['safe'], 'notes.txt', { type: 'text/plain' }));
    await client.transfer();
    await client.preview();
    await client.setAccess(false);
    expect(client.getSnapshot().preview).toBeUndefined();
    const writes = host.diagnostics().committedWrites;
    await client.mutate('remove');
    expect(host.diagnostics().committedWrites).toBe(writes);
    await client.setAccess(true);
    await client.mutate('remove');
    expect(client.getSnapshot().value?.state).toBe('removed');
    expect(client.getSnapshot().value?.access).toBe('missing');
  });
  it('removes an unsubmitted local selection without manufacturing a host receipt', async () => {
    const { client, host, sent } = await fixture();
    await client.select(new File(['local'], 'notes.txt'));
    await client.mutate('remove');
    expect(client.getSnapshot().value).toBeUndefined();
    expect(sent).toHaveLength(0);
    expect(host.diagnostics().resources).toBe(0);
  });
  it('rejects altered original acknowledgements and preserves the actual command for lookup', async () => {
    const { client, sent, corrupt } = await fixture();
    await client.select(new File(['local'], 'notes.txt'));
    corrupt();
    await client.transfer();
    expect(client.getSnapshot().operation?.state).toBe('outcome-unknown');
    expect(client.getSnapshot().operation?.command).toEqual(sent[0]);
  });
  it('rejects files over bound before reading them', async () => {
    const { client, sent } = await fixture();
    await client.select(new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'large.bin'));
    expect(client.getSnapshot().value).toBeUndefined();
    expect(sent).toHaveLength(0);
  });
  it('limits response bytes and does not accept a malformed capability source', async () => {
    const client = createUploadClient({ fetch: async () => new Response('x'.repeat(100_001)) });
    await client.connect();
    expect(client.getSnapshot().connected).toBe(false);
    client.dispose();
    const invalid = createUploadClient({ fetch: async () => new Response('{}') });
    await invalid.connect();
    expect(invalid.getSnapshot().connected).toBe(false);
    invalid.dispose();
  });
});
