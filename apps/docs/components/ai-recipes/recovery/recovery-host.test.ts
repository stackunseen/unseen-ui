import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdapterCommand } from '@stackunseen/ui-core/adapter';
import { createRecoveryHost } from './recovery-host';
import type { RecoveryHost } from './recovery-host';

const hosts: RecoveryHost[] = [];
const create = () => {
  const host = createRecoveryHost();
  hosts.push(host);
  return host;
};
afterEach(() => {
  hosts.splice(0).forEach((host) => host.dispose());
  vi.restoreAllMocks();
});

function latest(host: RecoveryHost) {
  return host.getSnapshot().commands.at(-1)!;
}
function stop(host: RecoveryHost) {
  host.request('stop');
  host.settleAcknowledgement();
  host.applyReceived();
}

describe('deterministic recovery server', () => {
  it('never schedules implicit execution or acknowledgement timers in this simulation', () => {
    const timer = vi.spyOn(globalThis, 'setTimeout');
    const host = create();
    host.advance();
    host.replayLast();
    host.request('stop');
    host.settleAcknowledgement();
    host.applyReceived();
    host.disconnect();
    host.settleRefresh(host.refresh());
    expect(timer).not.toHaveBeenCalled();
  });

  it('keeps the observed cursor while offline events advance the authoritative server', () => {
    const host = create();
    const original = host.getSnapshot().runtime;
    host.disconnect();
    host.failResponse();
    const refresh = host.refresh();
    expect(host.getSnapshot().runtime).toBe(original);
    expect(host.getSnapshot().connection.cursor?.sequence).toBe(original.lastSequence);
    host.settleRefresh(refresh);
    expect(host.getSnapshot().runtime.run.lifecycle).toBe('failed');
    expect(host.getSnapshot().connection.cursor?.sequence).toBeGreaterThan(original.lastSequence);
  });

  it('shows bounded request exhaustion as a visible error without discarding data', () => {
    const host = create();
    host.failResponse();
    host.setScenario('rejected');
    for (let count = 0; count < 16; count++) {
      host.request('send');
      host.settleAcknowledgement();
    }
    const previous = host.getSnapshot().runtime;
    expect(() => host.request('send')).not.toThrow();
    expect(host.getSnapshot().error).toContain('request limit');
    expect(host.getSnapshot().runtime).toBe(previous);
    expect(host.getSnapshot().draft).toContain('rollback owner');
    expect(host.getSnapshot().dispatches).toBe(16);
  });

  it('replays canonical events without duplicating text, sequence or revision', () => {
    const host = create();
    host.advance();
    const original = host.getSnapshot().runtime;
    expect(host.replayLast()).toBe('duplicate');
    expect(host.getSnapshot().runtime).toBe(original);
    expect(host.replayLast()).toBe('duplicate');
    expect(host.getSnapshot().runtime.messages.at(-1)).toBe(original.messages.at(-1));
  });

  it('retains partial output and draft through a failed refresh and rejects obsolete completions', () => {
    const host = create();
    host.setDraft('Unsent edited draft');
    const original = host.getSnapshot().runtime;
    host.disconnect();
    const old = host.refresh();
    host.disconnect();
    const current = host.refresh();
    expect(host.settleRefresh(old)).toBe('obsolete');
    expect(host.getSnapshot().connection.state).toBe('reconnecting');
    expect(host.settleRefresh(current, true)).toBe('failed');
    expect(host.getSnapshot().runtime).toBe(original);
    expect(host.getSnapshot().draft).toBe('Unsent edited draft');
    expect(host.settleRefresh(host.refresh())).toBe('ready');
    expect(host.getSnapshot().connection.adapter.resume).toBe(false);
    expect(host.getSnapshot().runtime.run.lifecycle).toBe('running');
  });

  it('unknown acknowledgement blocks requests across reconnect; original lookup never resends', () => {
    const host = create();
    host.setScenario('lost');
    host.request('stop');
    const original = latest(host).command;
    host.settleAcknowledgement();
    expect(latest(host).state).toBe('outcome-unknown');
    expect(host.submit(original)).toBe(latest(host));
    expect(host.getSnapshot().dispatches).toBe(1);
    host.disconnect();
    expect(() => host.lookup(original)).toThrow('Refresh');
    host.settleRefresh(host.refresh());
    expect(host.available()).toBe(false);
    expect(() => host.submit({ ...original, commandId: 'replacement' })).toThrow('Reconcile');
    host.setLookupUnavailable(true);
    expect(host.lookup(original).state).toBe('outcome-unknown');
    host.setLookupUnavailable(false);
    expect(host.lookup(original).state).toBe('acknowledged');
    expect(host.getSnapshot().dispatches).toBe(1);
    expect(host.getSnapshot().lookups).toBe(2);
    expect(host.getSnapshot().runtime.run.lifecycle).toBe('running');
    host.applyReceived();
    expect(host.getSnapshot().runtime.run.lifecycle).toBe('cancelled');
  });

  it('rejects reused identities and altered original receipt scopes/payloads', () => {
    const host = create();
    host.request('stop');
    const original = latest(host).command;
    expect(() => host.submit({ ...original, payload: { text: 'changed' } })).toThrow(
      'identity changed',
    );
    const changed: AdapterCommand = {
      ...original,
      scope: { ...original.scope, attemptId: 'other-attempt' },
    };
    expect(() => host.lookup(changed)).toThrow('exact original');
    expect(host.getSnapshot().dispatches).toBe(1);
    expect(Object.isFrozen(original)).toBe(true);
    expect(Object.isFrozen(original.scope)).toBe(true);
    expect(Object.isFrozen(original.payload)).toBe(true);
  });

  it('a received stop is not executed until server state; a completion race stays completed', () => {
    const host = create();
    host.request('stop');
    host.settleAcknowledgement();
    expect(host.getSnapshot().runtime.run.lifecycle).toBe('running');
    host.finishBeforeStop();
    host.applyReceived();
    expect(host.getSnapshot().runtime.run.lifecycle).toBe('succeeded');
    expect(host.getSnapshot().runtime.messages.at(-1)?.state).toBe('complete');
    expect(latest(host).detail).toContain('No execution applied');
  });

  it('retry uses a new stream and keeps the stopped partial response and edited draft', () => {
    const host = create();
    stop(host);
    const previous = host.getSnapshot().runtime;
    host.setDraft('New draft while retry is pending');
    host.request('retry');
    host.settleAcknowledgement();
    expect(host.getSnapshot().runtime.streamId).toBe(previous.streamId);
    host.applyReceived();
    expect(host.getSnapshot().runtime.streamId).not.toBe(previous.streamId);
    expect(host.getSnapshot().runtime.messages).toEqual(expect.arrayContaining(previous.messages));
    expect(host.getSnapshot().draft).toBe('New draft while retry is pending');
    expect(host.getSnapshot().notice).toContain('not a durable resume');
    const result = host.getSnapshot().runtime;
    host.applyReceived();
    expect(host.getSnapshot().runtime).toBe(result);
  });

  it('failure retains output, rejection retains draft, and send waits for acknowledged execution', () => {
    const host = create();
    host.failResponse();
    const partial = host.getSnapshot().runtime.messages.at(-1);
    expect(partial?.state).toBe('failed');
    host.setScenario('rejected');
    host.request('send');
    host.settleAcknowledgement();
    host.applyReceived();
    expect(latest(host).state).toBe('failed');
    expect(host.getSnapshot().runtime.messages.at(-1)).toBe(partial);
    expect(host.getSnapshot().draft).toContain('rollback owner');
    host.setScenario('received');
    host.request('send');
    const command = latest(host).command;
    host.setDraft('Keep this newer edit');
    host.settleAcknowledgement();
    expect(host.getSnapshot().runtime.run.lifecycle).toBe('failed');
    host.applyReceived();
    expect(host.getSnapshot().runtime.run.lifecycle).toBe('running');
    expect(host.getSnapshot().draft).toBe('Keep this newer edit');
    expect(host.lookup(command).state).toBe('acknowledged');
    expect(host.getSnapshot().dispatches).toBe(2);
  });

  it('continuation is explicitly a new attempt and unknown requests cannot apply', () => {
    const host = create();
    stop(host);
    const old = host.getSnapshot().runtime.streamId;
    host.setScenario('lost');
    host.request('continue');
    host.settleAcknowledgement();
    host.applyReceived();
    expect(host.getSnapshot().runtime.streamId).toBe(old);
    host.lookup(latest(host).command);
    host.applyReceived();
    expect(host.getSnapshot().runtime.streamId).not.toBe(old);
    expect(host.getSnapshot().runtime.messages.at(-2)).toMatchObject({
      text: 'Continue the checklist from the retained partial response.',
    });
  });

  it('rejects stale run versions without dispatching and pins the pending acknowledgement scenario', () => {
    const host = create();
    const runtime = host.getSnapshot().runtime;
    const command: AdapterCommand = {
      commandId: 'stale',
      scope: {
        workspaceId: 'simulated-recovery-workspace',
        threadId: runtime.run.threadId,
        runId: runtime.run.id,
        attemptId: runtime.run.attemptId,
        streamId: runtime.streamId,
        schemaVersion: 2,
      },
      expectedRunVersion: 99,
      operation: 'stop',
      payload: { text: '' },
    };
    expect(() => host.submit(command)).toThrow('stale');
    expect(host.getSnapshot().dispatches).toBe(0);
    host.setScenario('lost');
    host.request('stop');
    host.setScenario('received');
    host.settleAcknowledgement();
    expect(latest(host).state).toBe('outcome-unknown');
  });
});
