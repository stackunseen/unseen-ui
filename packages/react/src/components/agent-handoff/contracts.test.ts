import { describe, expect, it } from 'vitest';
import {
  inspectHandoffCommand,
  inspectHandoffReceipt,
  inspectHandoffSnapshot,
  validateHandoffDecision,
} from '@stackunseen/ui';
import { inspectHandoffSubmission } from './handoff-model.js';
import {
  acknowledgement,
  decisionNow,
  handoffFixture,
  handoffCommand,
  handoffReceipt,
} from '../../../../../tests/decision-fixtures.js';

describe('handoff acknowledged ownership and provenance', () => {
  it('binds the exact context, access and ownership revision', () => {
    const snapshot = handoffFixture(),
      command = handoffCommand(snapshot);
    expect(validateHandoffDecision(snapshot, command, decisionNow)).toBe(true);
    for (const field of [
      'handoffId',
      'version',
      'from',
      'to',
      'ownershipVersion',
      'snapshotVersion',
      'accessVersion',
    ] as const) {
      expect(
        validateHandoffDecision(
          snapshot,
          { ...command, target: { ...command.target, [field]: 'changed' } },
          decisionNow,
        ),
        field,
      ).toBe(false);
    }
    for (const field of ['id', 'version', 'sourceId', 'sourceVersion', 'providedBy'] as const) {
      expect(
        validateHandoffDecision(
          snapshot,
          {
            ...command,
            target: {
              ...command.target,
              context: { ...command.target.context, [field]: 'changed' },
            },
          },
          decisionNow,
        ),
        field,
      ).toBe(false);
    }
    expect(validateHandoffDecision(snapshot, command, Date.parse(snapshot.target.expiresAt))).toBe(
      false,
    );
    expect(validateHandoffDecision(snapshot, command, NaN)).toBe(false);
  });
  it.each([
    'accepted',
    'declined',
    'expired',
    'cancelled',
    'denied',
    'revoked',
    'unknown',
  ] as const)('blocks handoff %s', (status) => {
    expect(
      validateHandoffDecision({ ...handoffFixture(), status }, handoffCommand(), decisionNow),
    ).toBe(false);
  });
  it.each(['denied', 'revoked', 'unknown'] as const)('blocks recipient access %s', (state) => {
    const value = handoffFixture();
    value.access.state = state;
    expect(validateHandoffDecision(value, handoffCommand(value), decisionNow)).toBe(false);
  });
  it('rejects absent ownership, changed owners and stale snapshots', () => {
    const value = handoffFixture(),
      command = handoffCommand(value);
    expect(
      validateHandoffDecision({ ...value, ownership: { state: 'unknown' } }, command, decisionNow),
    ).toBe(false);
    for (const ownerId of ['agent-b', 'agent-c']) {
      expect(
        validateHandoffDecision(
          {
            ...value,
            ownership: {
              state: 'acknowledged',
              ownerId,
              version: 'owner-1',
              acknowledged: acknowledgement,
            },
          },
          command,
          decisionNow,
        ),
      ).toBe(false);
    }
    for (const freshness of ['stale', 'unknown'])
      expect(validateHandoffDecision({ ...value, freshness }, command, decisionNow)).toBe(false);
    expect(
      inspectHandoffSnapshot({ ...value, target: { ...value.target, to: 'agent-a' } }),
    ).toBeUndefined();
    expect(
      inspectHandoffSnapshot({ ...value, access: { ...value.access, subjectId: 'agent-c' } }),
    ).toBeUndefined();
  });
  it('requires actual recipient acknowledgement and a new ownership version for an applied transfer', () => {
    const command = handoffCommand(),
      receipt = handoffReceipt(command);
    expect(inspectHandoffReceipt(command, receipt)?.outcome).toBe('applied');
    for (const patch of [
      { ownerId: 'agent-a' },
      { ownershipVersion: 'owner-1' },
      { acknowledged: acknowledgement },
      { accessVersion: 'access-2' },
      { context: { ...command.target.context, version: 'c2' } },
      { decision: 'decline' },
    ])
      expect(inspectHandoffReceipt(command, { ...receipt, ...patch })).toBeUndefined();
    expect(
      inspectHandoffReceipt(command, {
        ...receipt,
        command: { ...command, target: { ...command.target, snapshotVersion: 'snapshot-2' } },
      }),
    ).toBeUndefined();
    const decline = { ...command, decision: 'decline' as const };
    expect(
      inspectHandoffReceipt(decline, {
        ...receipt,
        command: decline,
        decision: 'decline',
        ownerId: 'agent-a',
        ownershipVersion: 'owner-1',
      })?.outcome,
    ).toBe('applied');
  });
  it('keeps the lookup original immutable independently of current provenance', () => {
    const command = handoffCommand(),
      parsed = inspectHandoffCommand(command)!;
    command.target.context.version = 'changed';
    expect(parsed.target.context.version).toBe('c1');
    expect(Object.isFrozen(parsed.target.context)).toBe(true);
    const record = inspectHandoffSubmission({
      state: 'outcome-unknown',
      original: parsed,
      receipt: { bad: true },
    });
    expect(record && record.state !== 'idle' && record.original).toEqual(parsed);
  });
  it('supports two actor compare-and-set and historical lookup without replay (synthetic host)', () => {
    let current = handoffFixture(),
      transfers = 0;
    const original = inspectHandoffCommand(handoffCommand(current))!;
    const secondActor = { ...original, commandId: 'competing-command' };
    // A synthetic host applies once and loses its response. Nothing in the component executes this.
    expect(validateHandoffDecision(current, original, decisionNow)).toBe(true);
    const receipt = handoffReceipt(original);
    transfers++;
    current = {
      ...current,
      status: 'accepted',
      ownership: {
        state: 'acknowledged',
        ownerId: 'agent-b',
        version: 'owner-2',
        acknowledged: { ...acknowledgement, by: 'agent-b' },
      },
    };
    expect(validateHandoffDecision(current, secondActor, decisionNow)).toBe(false);
    current.access.state = 'revoked';
    const lookup = () => inspectHandoffReceipt(original, receipt);
    expect(lookup()?.outcome).toBe('applied');
    expect(lookup()?.outcome).toBe('applied');
    expect(transfers).toBe(1);
    expect(current.ownership.state === 'acknowledged' && current.ownership.ownerId).toBe('agent-b');
  });
});
