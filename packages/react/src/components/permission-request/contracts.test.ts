import { describe, expect, it, vi } from 'vitest';
import {
  inspectPermissionCommand,
  inspectPermissionReceipt,
  inspectPermissionSnapshot,
  validatePermissionDecision,
} from '@ai-interaction/react';
import { inspectPermissionSubmission } from './permission-model.js';
import {
  acknowledgement,
  decisionNow,
  permissionFixture,
  permissionCommand,
  permissionReceipt,
} from '../../../../../tests/decision-fixtures.js';

describe('permission exact decision contracts', () => {
  it('requires the current exact scope, subject, version, access and expiry', () => {
    const snapshot = permissionFixture(),
      command = permissionCommand(snapshot);
    expect(validatePermissionDecision(snapshot, command, decisionNow)).toBe(true);
    for (const field of [
      'requestId',
      'version',
      'resource',
      'subjectId',
      'accessVersion',
      'expiresAt',
    ] as const) {
      expect(
        validatePermissionDecision(
          snapshot,
          { ...command, target: { ...command.target, [field]: 'different' } },
          decisionNow,
        ),
        field,
      ).toBe(false);
    }
    for (const field of [
      'workspaceId',
      'threadId',
      'branchId',
      'runId',
      'attemptId',
      'streamId',
    ] as const) {
      expect(
        validatePermissionDecision(
          snapshot,
          {
            ...command,
            target: { ...command.target, scope: { ...command.target.scope, [field]: 'different' } },
          },
          decisionNow,
        ),
        field,
      ).toBe(false);
    }
    expect(
      validatePermissionDecision(
        snapshot,
        { ...command, target: { ...command.target, runVersion: 4 } },
        decisionNow,
      ),
    ).toBe(false);
    expect(
      validatePermissionDecision(
        snapshot,
        { ...command, target: { ...command.target, scopes: ['accounts:write'] } },
        decisionNow,
      ),
    ).toBe(false);
    expect(validatePermissionDecision(snapshot, command, NaN)).toBe(false);
    expect(
      validatePermissionDecision(snapshot, command, Date.parse(snapshot.target.expiresAt)),
    ).toBe(false);
  });
  it.each(['granted', 'denied', 'revoked', 'expired', 'unknown'] as const)(
    'blocks permission %s',
    (status) => {
      expect(
        validatePermissionDecision(
          { ...permissionFixture(), status },
          permissionCommand(),
          decisionNow,
        ),
      ).toBe(false);
    },
  );
  it.each(['denied', 'revoked', 'unknown'] as const)('blocks access %s', (state) => {
    const value = permissionFixture();
    value.access.state = state;
    expect(validatePermissionDecision(value, permissionCommand(value), decisionNow)).toBe(false);
  });
  it.each(['stale', 'unknown'] as const)('blocks freshness %s', (freshness) => {
    expect(
      validatePermissionDecision(
        { ...permissionFixture(), freshness },
        permissionCommand(),
        decisionNow,
      ),
    ).toBe(false);
  });
  it('rejects incomplete, duplicate, unbounded and mismatched access data', () => {
    const value = permissionFixture();
    for (const scopes of [
      [],
      [' '],
      ['read', 'read'],
      Array.from({ length: 51 }, (_, i) => `scope-${i}`),
    ]) {
      expect(
        inspectPermissionSnapshot({ ...value, target: { ...value.target, scopes } }),
      ).toBeUndefined();
    }
    expect(inspectPermissionSnapshot({ ...value, status: 'granted' })).toBeUndefined();
    expect(
      inspectPermissionSnapshot({
        ...value,
        access: { ...value.access, subjectId: 'another-user' },
      }),
    ).toBeUndefined();
    expect(
      inspectPermissionSnapshot({ ...value, access: { ...value.access, version: 'new-access' } }),
    ).toBeUndefined();
    expect(
      inspectPermissionSnapshot({ ...value, target: { ...value.target, resource: ' ' } }),
    ).toBeUndefined();
  });
  it('keeps host input mutable but produces an independent immutable command', () => {
    const input = permissionCommand(),
      parsed = inspectPermissionCommand(input)!;
    expect(Object.isFrozen(parsed.target.scopes)).toBe(true);
    expect(Object.isFrozen(input.target.scopes)).toBe(false);
    input.target.scopes.push('accounts:write');
    expect(parsed.target.scopes).toEqual(['accounts:read']);
    const getter = vi.fn(() => 'permission-command-1');
    expect(
      inspectPermissionCommand({
        ...input,
        get commandId() {
          return getter();
        },
      }),
    ).toBeUndefined();
    expect(getter).not.toHaveBeenCalled();
    const cycle: Record<string, unknown> = {};
    cycle.target = cycle;
    expect(inspectPermissionCommand(cycle)).toBeUndefined();
  });
  it('matches the whole original, not only command ID, and distinguishes accepted from applied', () => {
    const command = permissionCommand(),
      applied = permissionReceipt(command);
    expect(inspectPermissionReceipt(command, applied)?.outcome).toBe('applied');
    expect(inspectPermissionReceipt(command, { command, outcome: 'accepted' })?.outcome).toBe(
      'accepted',
    );
    expect(
      inspectPermissionReceipt(command, { ...applied, command: { ...command, decision: 'deny' } }),
    ).toBeUndefined();
    expect(
      inspectPermissionReceipt(command, {
        ...applied,
        command: { ...command, target: { ...command.target, version: 'p2' } },
      }),
    ).toBeUndefined();
    expect(inspectPermissionReceipt(command, { ...applied, grant: undefined })).toBeUndefined();
    expect(inspectPermissionReceipt(command, { ...applied, permission: 'denied' })).toBeUndefined();
    const denied = { ...command, decision: 'deny' as const };
    expect(
      inspectPermissionReceipt(denied, {
        command: denied,
        outcome: 'applied',
        permission: 'denied',
        acknowledged: acknowledgement,
      })?.outcome,
    ).toBe('applied');
  });
  it('retains the original when a malformed receipt arrives', () => {
    const original = permissionCommand();
    const receipt = { bad: true };
    const record = inspectPermissionSubmission({ state: 'outcome-unknown', original, receipt });
    expect(record && record.state !== 'idle' && record.original).toEqual(original);
    expect(inspectPermissionReceipt(original, { bad: true })).toBeUndefined();
    expect(Object.isFrozen(receipt)).toBe(false);
    expect(Object.isFrozen(original)).toBe(false);
  });
});
