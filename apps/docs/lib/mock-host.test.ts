import { afterEach, expect, it, vi } from 'vitest';
import { createMockHost } from './mock-host';
afterEach(() => vi.useRealTimers());
function ready() {
  const host = createMockHost();
  host.start('Review accounts');
  vi.runAllTimers();
  return host;
}
it('resolves a duplicate/two-client approval once and rejects a revised proposal', () => {
  vi.useFakeTimers();
  const host = ready();
  const p = host.runtime.getSnapshot().approval!;
  const cmd = {
    commandId: 'one',
    proposalId: p.id,
    version: p.version,
    actionDigest: p.actionDigest,
    decision: 'approve' as const,
  };
  host.revise();
  expect(host.decide(cmd).accepted).toBe(false);
  const updated = host.runtime.getSnapshot().approval!;
  const current = { ...cmd, version: updated.version, actionDigest: updated.actionDigest };
  expect(host.decide(current).accepted).toBe(true);
  const snapshot = host.runtime.getSnapshot();
  expect(host.decide(current).accepted).toBe(true);
  expect(host.runtime.getSnapshot()).toBe(snapshot);
  expect(host.decide({ ...current, commandId: 'other-tab' }).accepted).toBe(false);
  expect(snapshot.tools.filter((t) => t.id === 'archive-accounts')).toHaveLength(1);
  host.dispose();
});
it('reconciles an acknowledgement lost after execution without repeating the action', () => {
  vi.useFakeTimers();
  const host = ready();
  const p = host.runtime.getSnapshot().approval!;
  const cmd = {
    commandId: 'lost',
    proposalId: p.id,
    version: p.version,
    actionDigest: p.actionDigest,
    decision: 'approve' as const,
  };
  expect(host.decide(cmd, true).reason).toBe('outcome-unknown');
  expect(host.runtime.getSnapshot().approval?.status).toBe('pending');
  expect(host.runtime.getSnapshot().stale).toBe(true);
  expect(host.reconcile('lost').accepted).toBe(true);
  expect(host.runtime.getSnapshot()).toMatchObject({
    stale: false,
    run: { lifecycle: 'succeeded' },
    approval: { status: 'approved' },
  });
  host.dispose();
});
it('keeps partial text after cancellation and does not overwrite completed work', () => {
  vi.useFakeTimers();
  const host = createMockHost();
  host.start('Review');
  vi.advanceTimersByTime(400);
  host.cancel();
  const cancelled = host.runtime.getSnapshot();
  vi.runAllTimers();
  expect(host.runtime.getSnapshot().run.lifecycle).toBe('cancelled');
  expect(cancelled.messages[1]?.state).toBe('interrupted');
  expect(cancelled.messages[1]?.text?.length).toBeGreaterThan(0);
  host.start('New attempt');
  vi.runAllTimers();
  const p = host.runtime.getSnapshot().approval!;
  host.decide({
    commandId: 'complete',
    proposalId: p.id,
    version: p.version,
    actionDigest: p.actionDigest,
    decision: 'reject',
  });
  host.cancel();
  expect(host.runtime.getSnapshot().run.lifecycle).toBe('succeeded');
  expect(host.runtime.getSnapshot().tools.find((t) => t.id === 'archive-accounts')?.state).toBe(
    'denied',
  );
  host.dispose();
});
it('rejects a pending decision after permission revocation even while its client is disconnected', () => {
  vi.useFakeTimers();
  const host = ready();
  const p = host.runtime.getSnapshot().approval!;
  host.disconnect();
  host.revokePermission();
  const result = host.decide({
    commandId: 'stale-permission',
    proposalId: p.id,
    version: p.version,
    actionDigest: p.actionDigest,
    decision: 'approve',
  });
  expect(result).toEqual({
    accepted: false,
    reason: 'Access was revoked. Start a new authorized review.',
  });
  expect(host.runtime.getSnapshot().approval?.status).toBe('pending');
  host.reconnect();
  const state = host.runtime.getSnapshot();
  expect(state.run.lifecycle).toBe('cancelled');
  expect(state.approval?.status).toBe('superseded');
  expect(state.tools.find((t) => t.id === p.toolCallId)?.state).toBe('denied');
  expect(state.sources.every((s) => s.access === 'revoked' && !s.excerpt && !s.url)).toBe(true);
  expect(state.artifacts).toHaveLength(0);
  host.dispose();
});
it('preserves acknowledged outcomes when access is revoked later and stops in-flight streaming', () => {
  vi.useFakeTimers();
  const host = ready();
  const p = host.runtime.getSnapshot().approval!;
  const command = {
    commandId: 'before-revoke',
    proposalId: p.id,
    version: p.version,
    actionDigest: p.actionDigest,
    decision: 'approve' as const,
  };
  host.decide(command);
  host.revokePermission();
  const after = host.runtime.getSnapshot();
  expect(host.decide(command)).toEqual({ accepted: true });
  expect(host.runtime.getSnapshot()).toBe(after);
  expect(after.run.lifecycle).toBe('succeeded');
  host.start('New authorized attempt');
  vi.advanceTimersByTime(400);
  host.revokePermission();
  const text = host.runtime.getSnapshot().messages[1]?.text;
  vi.runAllTimers();
  expect(host.runtime.getSnapshot().messages[1]).toMatchObject({ state: 'interrupted', text });
  expect(host.runtime.getSnapshot().approval).toBeNull();
  host.dispose();
});
