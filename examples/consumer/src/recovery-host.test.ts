import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAdapterSession } from '@stackunseen/ui-core/adapter';
import type { AdapterCommand, AdapterSession, AdapterObserver } from '@stackunseen/ui-core/adapter';
import { createLocalRecoveryHost } from './recovery-host';
import type { LocalRecoveryHost } from './recovery-host';

const environments: { host: LocalRecoveryHost; session: AdapterSession }[] = [];
function setup() {
  const host = createLocalRecoveryHost();
  const session = createAdapterSession(host.port, host.scope, host.initialSnapshot);
  environments.push({ host, session });
  return { host, session };
}
function command(host: LocalRecoveryHost): AdapterCommand {
  return {
    commandId: 'original-local-request',
    scope: host.scope,
    expectedRunVersion: 0,
    operation: 'request-local-review',
    payload: { subject: 'Component spacing' },
  };
}
function observer(): AdapterObserver {
  return { event: vi.fn(), disconnected: vi.fn() };
}
afterEach(() => {
  environments.splice(0).forEach(({ host, session }) => {
    session.dispose();
    host.dispose();
  });
});

describe('owned local recovery host', () => {
  it('requires explicit opening, provides a current canonical checkpoint and releases replaced channels', async () => {
    const { host, session } = setup();
    expect(session.getSnapshot().connection).toMatchObject({
      state: 'disconnected',
      freshness: 'unknown',
      adapter: { resume: false, snapshot: true },
    });
    expect(host.diagnostics().activeChannels).toBe(0);
    expect(await session.refresh()).toBe('ready');
    expect(session.getSnapshot().connection).toMatchObject({
      state: 'connected',
      freshness: 'current',
    });
    expect(session.getSnapshot().runtime.run.lifecycle).toBe('queued');
    expect(session.getSnapshot().history).toMatchObject({ startIndex: 8, totalMessages: 12 });
    expect(session.getSnapshot().history?.messages).toHaveLength(4);
    expect(host.diagnostics().activeChannels).toBe(1);
    expect(await session.refresh()).toBe('ready');
    expect(host.diagnostics()).toMatchObject({ activeChannels: 1, closedChannels: 1 });
    session.dispose();
    session.dispose();
    expect(host.diagnostics()).toMatchObject({ activeChannels: 0, closedChannels: 2 });
  });
  it('separates exact receipt acceptance from the host events that advance message and run', async () => {
    const { host, session } = setup();
    await session.refresh();
    const original = command(host);
    expect((await session.submit(original)).state).toBe('acknowledged');
    expect(host.getSnapshot().run).toMatchObject({ lifecycle: 'queued', version: 0 });
    expect(session.getSnapshot().runtime.messages).toHaveLength(12);
    expect(session.getSnapshot().runtime.lastSequence).toBe(0);
    host.advance(original.commandId);
    expect(session.getSnapshot().runtime).toMatchObject({
      lastSequence: 3,
      run: { lifecycle: 'succeeded', version: 2 },
      stale: false,
    });
    expect(session.getSnapshot().runtime.messages.at(-1)?.id).toBe('local-action-response');
    expect(session.getSnapshot().commands[0]?.state).toBe('acknowledged');
    expect(host.canAdvance(original.commandId)).toBe(false);
    expect(() => host.advance(original.commandId)).toThrow(/unapplied accepted original/);
  });
  it('retains the original lost acknowledgement through refresh and lookup without resending', async () => {
    const { host, session } = setup();
    await session.refresh();
    host.loseNextAcknowledgement();
    const original = command(host);
    expect((await session.submit(original)).state).toBe('outcome-unknown');
    expect(host.diagnostics().dispatches).toBe(1);
    expect(host.getSnapshot().run.lifecycle).toBe('queued');
    await session.refresh();
    expect(session.getSnapshot().commands[0]?.state).toBe('outcome-unknown');
    expect((await session.submit(original)).state).toBe('outcome-unknown');
    expect(host.diagnostics().dispatches).toBe(1);
    expect((await session.reconcile(original.commandId)).state).toBe('acknowledged');
    expect(host.getSnapshot().run.lifecycle).toBe('queued');
    expect(host.diagnostics().dispatches).toBe(1);
    expect(session.getSnapshot().commands[0]?.command).toEqual(original);
  });
  it('recovers missed host events without confusing execution evidence and unknown original receipts', async () => {
    const { host, session } = setup();
    await session.refresh();
    host.loseNextAcknowledgement();
    const original = command(host);
    await session.submit(original);
    host.interrupt();
    expect(session.getSnapshot().connection).toMatchObject({
      state: 'disconnected',
      freshness: 'stale',
    });
    host.advance(original.commandId);
    expect(host.getSnapshot().run.lifecycle).toBe('succeeded');
    expect(session.getSnapshot().runtime.run.lifecycle).toBe('queued');
    expect(await session.refresh()).toBe('ready');
    expect(session.getSnapshot().runtime).toMatchObject({
      lastSequence: 3,
      run: { lifecycle: 'succeeded' },
    });
    expect(session.getSnapshot().history).toMatchObject({ startIndex: 9, totalMessages: 13 });
    expect(session.getSnapshot().commands[0]?.state).toBe('outcome-unknown');
    await session.reconcile(original.commandId);
    expect(session.getSnapshot().commands[0]?.state).toBe('acknowledged');
    expect(host.diagnostics().dispatches).toBe(1);
  });
  it('captures checkpoint and subscription synchronously so events before open resolution remain coherent', async () => {
    const { host, session } = setup();
    const original = command(host);
    await host.port.dispatch!(original);
    const opening = session.refresh();
    // open has captured sequence 0 and subscribed, but its Promise is not resolved yet.
    host.advance(original.commandId);
    expect(await opening).toBe('ready');
    expect(session.getSnapshot().runtime).toMatchObject({
      lastSequence: 3,
      run: { lifecycle: 'succeeded' },
    });
    expect(session.getSnapshot().connection.freshness).toBe('current');
    expect(session.getSnapshot().runtime.messages).toHaveLength(13);
  });
  it('pages bounded immutable history while live run events advance a newer projection', async () => {
    const { host, session } = setup();
    await session.refresh();
    const initial = session.getSnapshot().history!;
    const older = {
      context: initial.context,
      direction: 'older' as const,
      cursor: initial.older.cursor!,
    };
    expect(await session.page(older)).toBe('applied');
    expect(session.getSnapshot().history).toMatchObject({
      startIndex: 4,
      totalMessages: 12,
      context: initial.context,
    });
    const middle = session.getSnapshot().history!;
    await session.submit(command(host));
    host.advance('original-local-request');
    expect(
      await session.page({
        context: middle.context,
        direction: 'older',
        cursor: middle.older.cursor!,
      }),
    ).toBe('applied');
    expect(session.getSnapshot().history).toMatchObject({
      startIndex: 0,
      totalMessages: 12,
      older: { state: 'end' },
      context: initial.context,
    });
    expect(session.getSnapshot().history?.messages).toHaveLength(4);
    const oldResponse = await host.port.readHistory!(older);
    expect(oldResponse).toMatchObject({ totalMessages: 12, context: initial.context });
    await session.refresh();
    expect(session.getSnapshot().history).toMatchObject({
      totalMessages: 13,
      context: { version: '3' },
    });
    expect(await session.page(older)).toBe('obsolete');
  });
  it('keeps original receipts immutable and refuses lookup or ID reuse with altered content', async () => {
    const { host } = setup();
    const original = command(host);
    const receipt = await host.port.dispatch!(original);
    expect(receipt).toMatchObject({ command: original, outcome: 'accepted' });
    expect(Object.isFrozen((receipt as { command: AdapterCommand }).command)).toBe(true);
    expect(Object.isFrozen((receipt as { command: AdapterCommand }).command.payload)).toBe(true);
    const altered = { ...original, payload: { subject: 'Different action' } };
    await expect(host.port.lookup!(altered)).rejects.toThrow(/exact original/);
    await expect(host.port.dispatch!(altered)).rejects.toThrow(/reused with different/);
    expect(await host.port.lookup!(original)).toEqual(receipt);
  });
  it('rejects changed scope or unsupported action without fabricating execution', async () => {
    const { host } = setup();
    await expect(
      host.port.open!({ ...host.scope, streamId: 'different' }, observer()),
    ).rejects.toThrow(/scope changed/);
    expect(host.diagnostics().activeChannels).toBe(0);
    const unsupported = { ...command(host), operation: 'execute-arbitrary-code' };
    expect(await host.port.dispatch!(unsupported)).toMatchObject({ outcome: 'rejected' });
    expect(host.canAdvance(unsupported.commandId)).toBe(false);
    expect(host.getSnapshot()).toMatchObject({ lastSequence: 0, run: { lifecycle: 'queued' } });
  });
  it('closes owned channels once, suppresses events after close and releases host resources on disposal', async () => {
    const { host } = setup();
    await host.port.dispatch!(command(host));
    const sink = observer();
    const channel = await host.port.open!(host.scope, sink);
    channel.close();
    channel.close();
    expect(host.diagnostics()).toMatchObject({ activeChannels: 0, closedChannels: 1 });
    host.advance('original-local-request');
    expect(sink.event).not.toHaveBeenCalled();
    const next = observer();
    await host.port.open!(host.scope, next);
    host.dispose();
    host.dispose();
    expect(next.disconnected).toHaveBeenCalledOnce();
    expect(host.diagnostics()).toMatchObject({ activeChannels: 0, closedChannels: 2 });
    await expect(host.port.lookup!(command(host))).rejects.toThrow(/disposed/);
  });
  it('refuses invalid cursors and different history context', async () => {
    const { host, session } = setup();
    await session.refresh();
    const context = session.getSnapshot().history!.context;
    for (const cursor of ['junk', '-1', '01', '999'])
      await expect(host.port.readHistory!({ context, direction: 'older', cursor })).rejects.toThrow(
        /cursor/,
      );
    await expect(
      host.port.readHistory!({
        context: { ...context, snapshotId: 'different' },
        direction: 'older',
        cursor: '0',
      }),
    ).rejects.toThrow(/not retained/);
  });
});
