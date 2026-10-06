import { describe, expect, it } from 'vitest';
import {
  actionHostEvent as send,
  canExecute,
  createActionHost,
  isReviewCurrent,
  type ActionHost,
} from './action-host';

function withAccess(): ActionHost {
  const host = createActionHost();
  return send(
    send(host, {
      type: 'permission-submit',
      original: { commandId: 'test-access', target: host.permission.target, decision: 'allow' },
    }),
    { type: 'permission-accept' },
  );
}
function submit(host = withAccess()) {
  return send(host, {
    type: 'decision-submit',
    decision: 'approve',
    proposal: host.reviewed.proposal,
  });
}
function accepted() {
  return send(submit(), { type: 'decision-accept' });
}

describe('action receipt simulated host', () => {
  it('requires acknowledged access and exact review before submission, and acceptance before execution', () => {
    const initial = createActionHost();
    expect(submit(initial)).toBe(initial);
    const pending = submit();
    expect(send(pending, { type: 'execute' })).toBe(pending);
    const ready = send(pending, { type: 'decision-accept' });
    expect(ready.executions).toBe(0);
    expect(ready.result).toBeUndefined();
    expect(canExecute(ready)).toBe(true);
  });

  it.each(['version', 'scope', 'resource', 'access', 'expiry'] as const)(
    'rejects a submitted decision after %s changes',
    (field) => {
      const original = submit();
      const changed = send(original, { type: 'change', field });
      expect(isReviewCurrent(changed)).toBe(false);
      const rejected = send(changed, { type: 'decision-accept' });
      expect(rejected.decision.state).toBe('failed');
      expect(rejected.acceptedReceipt?.outcome).toBe('rejected');
      expect(send(rejected, { type: 'execute' }).executions).toBe(0);
      if (rejected.decision.state !== 'idle' && original.decision.state !== 'idle') {
        expect(rejected.decision.original).toEqual(original.decision.original);
      }
    },
  );

  it.each(['version', 'scope', 'resource', 'access', 'expiry'] as const)(
    'rechecks %s after acceptance and before execution',
    (field) => {
      const changed = send(accepted(), { type: 'change', field });
      expect(canExecute(changed)).toBe(false);
      expect(send(changed, { type: 'execute' })).toBe(changed);
    },
  );

  it('does not accept a callback carrying a stale displayed proposal', () => {
    const host = withAccess();
    const proposal = { ...host.reviewed.proposal, version: 99 };
    expect(send(host, { type: 'decision-submit', decision: 'approve', proposal })).toBe(host);
  });

  it('uses lookup after lost decision acknowledgement and never resends on not-found', () => {
    const unknown = send(submit(), { type: 'decision-accept', loseAcknowledgement: true });
    expect(unknown.decision.state).toBe('outcome-unknown');
    expect(canExecute(unknown)).toBe(false);
    const missing = send(unknown, { type: 'lookup-decision', notFound: true });
    expect(missing.decision.state).toBe('outcome-unknown');
    expect(submit(missing)).toBe(missing);
    expect(send(missing, { type: 'decision-accept' })).toBe(missing);
    const recovered = send(missing, { type: 'lookup-decision' });
    expect(recovered.decision.state).toBe('acknowledged');
    expect(recovered.executions).toBe(0);
    expect(canExecute(recovered)).toBe(true);
  });

  it('deduplicates double clicks, execution retries and result lookup after a lost acknowledgement', () => {
    const pending = submit();
    expect(submit(pending)).toBe(pending);
    const ready = send(pending, { type: 'decision-accept' });
    expect(send(ready, { type: 'decision-accept' })).toBe(ready);
    const running = send(ready, { type: 'execute' });
    expect(send(running, { type: 'execute' })).toBe(running);
    const unknown = send(running, { type: 'finish', loseAcknowledgement: true });
    expect(unknown.tool.state).toBe('outcome-unknown');
    expect(unknown.result).toBeUndefined();
    expect(send(unknown, { type: 'execute' })).toBe(unknown);
    const result = send(unknown, { type: 'lookup-result' });
    const retryLookup = send(result, { type: 'lookup-result' });
    expect(retryLookup.executions).toBe(1);
    expect(retryLookup.result?.command).toEqual(
      ready.decision.state !== 'idle' ? ready.decision.original : undefined,
    );
    expect(retryLookup.result?.outcome).toBe('succeeded');
    expect(send(retryLookup, { type: 'finish' })).toBe(retryLookup);
    expect(send(retryLookup, { type: 'execute' })).toBe(retryLookup);
  });

  it('retains applied effects on partial failure and blocks blanket retries', () => {
    const partial = send(send(accepted(), { type: 'execute' }), { type: 'finish', partial: true });
    expect(partial.result?.effects.map((effect) => effect.outcome)).toEqual(['applied', 'failed']);
    expect(partial.tool.state).toBe('failed');
    expect(send(partial, { type: 'execute' })).toBe(partial);
    expect(send(partial, { type: 'review-current' })).toBe(partial);
    expect(send(partial, { type: 'lookup-result' }).executions).toBe(1);
  });

  it('never executes a rejected user decision', () => {
    const host = withAccess();
    const rejected = send(
      send(host, { type: 'decision-submit', decision: 'reject', proposal: host.reviewed.proposal }),
      { type: 'decision-accept' },
    );
    expect(rejected.acceptedReceipt?.outcome).toBe('accepted');
    expect(rejected.tool.state).toBe('denied');
    expect(canExecute(rejected)).toBe(false);
  });

  it('reissues expired review with a new binding and requires new access; snapshots are immutable', () => {
    const original = submit();
    expect(Object.isFrozen(original.current.proposal)).toBe(true);
    const rejected = send(send(original, { type: 'change', field: 'expiry' }), {
      type: 'decision-accept',
    });
    const fresh = send(rejected, { type: 'review-current' });
    expect(fresh.current.proposal.version).toBe(2);
    expect(fresh.current.proposal.expiresAt).not.toBe(rejected.current.proposal.expiresAt);
    expect(fresh.permission.status).toBe('requested');
    expect(fresh.decision.state).toBe('idle');
    expect(submit(fresh)).toBe(fresh);
    expect(original.current.proposal.version).toBe(1);
  });
});
