// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setTimeout as delay } from 'node:timers/promises';
import { createPtyHost } from './host.mjs';
import type { PtyHost } from './host.mjs';

let host: PtyHost;
beforeEach(() => {
  host = createPtyHost();
});
afterEach(async () => {
  await host.close();
});
async function observed(predicate: () => boolean) {
  const deadline = Date.now() + 3000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('Native PTY observation timed out.');
    await delay(20);
  }
}
async function start() {
  const receipt = host.start({ requestId: 'start' });
  expect(receipt.status).toBe('acknowledged');
  await observed(() => host.snapshot().output.includes('Commands:'));
  expect(receipt.context).toEqual(host.snapshot().context);
}
const input = (data: string, requestId = 'input') => ({
  ...host.snapshot().context,
  requestId,
  data,
});
describe('actual fixed-process PTY host', () => {
  it('launches a real TTY, preserves ANSI, acknowledges input once and reports actual exit', async () => {
    await start();
    expect(host.snapshot().output).toContain('stdinTTY=true stdoutTTY=true');
    const request = input('colors\r');
    const receipt = host.input(request);
    expect(host.input({ ...request })).toEqual(receipt);
    await observed(() => host.snapshot().output.includes('Green sample'));
    expect(host.snapshot().output).toContain('\x1b[32m');
    expect(host.snapshot().output.match(/Green sample/g)).toHaveLength(1);
    host.input(input('exit\r', 'exit'));
    await observed(() => host.snapshot().state !== 'running');
    expect(host.snapshot()).toMatchObject({ state: 'complete', exitCode: 0 });
    expect(host.receipt(request.requestId)).toEqual(receipt);
  });
  it('resizes the actual terminal and rejects stale scopes or request-ID conflicts', async () => {
    await start();
    host.resize({ ...host.snapshot().context, requestId: 'resize', columns: 64, rows: 18 });
    await delay(150);
    host.input(input('size\r'));
    await observed(() => host.snapshot().output.includes('Size 64x18'));
    expect(() => host.input(input('help\r'))).toThrow('different action');
    expect(() => host.input({ ...input('help\r', 'stale'), version: 'obsolete' })).toThrow(
      'scope changed',
    );
  });
  it('rotates cleared streams while retaining receipts without replaying input', async () => {
    await start();
    const request = input('help\r');
    host.input(request);
    await observed(() => host.snapshot().output.includes('Only help'));
    const old = host.snapshot().context,
      clear = { ...old, requestId: 'clear' };
    const receipt = host.clear(clear);
    expect(host.clear(clear)).toEqual(receipt);
    expect(host.snapshot().context.streamId).not.toBe(old.streamId);
    expect(host.snapshot().output).toBe('');
    expect(host.input(request).status).toBe('acknowledged');
    expect(() => host.input({ ...request, requestId: 'new-old-input' })).toThrow('scope changed');
    await delay(100);
    expect(host.snapshot().output).toBe('');
  });
  it('keeps stop requested separate from actual termination and denies revoked data/input', async () => {
    await start();
    const old = host.snapshot().context;
    host.stop({ ...old, requestId: 'stop' });
    expect(host.snapshot().stopRequested).toBe(true);
    await observed(() => host.snapshot().state === 'cancelled');
    host.setAccess(false);
    expect(host.snapshot()).toMatchObject({ status: 'denied', output: '', state: 'unknown' });
    expect(() => host.input({ ...old, requestId: 'denied', data: 'help\r' })).toThrow(
      'access denied',
    );
    host.setAccess(true);
    expect(host.snapshot().context.version).not.toBe(old.version);
    expect(() => host.resize({ ...old, requestId: 'resize', columns: 80, rows: 12 })).toThrow(
      'scope changed',
    );
  });
  it('rejects untrusted request shapes and unsupported controls before native invocation', async () => {
    expect(() => host.start({ requestId: 'start', command: 'powershell' })).toThrow('fields');
    await start();
    expect(() => host.input(input('\x1b[6n'))).toThrow('vocabulary');
    expect(() => host.input({ ...input('help'), extra: 1 })).toThrow('fields');
    expect(() =>
      host.resize({ ...host.snapshot().context, requestId: 'bad', columns: 999, rows: 18 }),
    ).toThrow('dimensions');
    let read = false;
    const malicious = { ...input('help') };
    Object.defineProperty(malicious, 'data', {
      get: () => {
        read = true;
        return 'help';
      },
    });
    expect(() => host.input(malicious)).toThrow('fields');
    expect(read).toBe(false);
    expect(host.receipt('missing')).toEqual({ requestId: 'missing', status: 'unknown' });
  });
});
