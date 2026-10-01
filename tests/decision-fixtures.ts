import type {
  PermissionSnapshot,
  PermissionDecisionCommand,
  PermissionReceipt,
} from '@ai-interaction/react';
import type {
  HandoffSnapshot,
  HandoffDecisionCommand,
  HandoffReceipt,
} from '@ai-interaction/react';

export const decisionNow = Date.parse('2026-09-30T12:00:00Z');
export const acknowledgement = { by: 'host', at: '2026-09-30T11:00:00Z' };
export function permissionFixture(): PermissionSnapshot {
  return {
    target: {
      scope: {
        workspaceId: 'w1',
        threadId: 't1',
        branchId: 'b1',
        runId: 'r1',
        attemptId: 'a1',
        streamId: 's1',
        schemaVersion: 2,
      },
      runVersion: 3,
      requestId: 'permission-1',
      version: 'p1',
      subjectId: 'reader',
      resource: 'CRM',
      scopes: ['accounts:read'],
      accessVersion: 'access-1',
      expiresAt: '2099-10-01T12:00:00Z',
    },
    status: 'requested',
    freshness: 'current',
    access: {
      state: 'available',
      version: 'access-1',
      subjectId: 'reader',
      checkedBy: 'host',
      checkedAt: acknowledgement.at,
    },
  };
}
export function permissionCommand(value = permissionFixture()): PermissionDecisionCommand {
  return {
    commandId: 'permission-command-1',
    target: structuredClone(value.target),
    decision: 'allow',
  };
}
export function permissionReceipt(command = permissionCommand()): PermissionReceipt {
  return {
    command: structuredClone(command),
    outcome: 'applied',
    permission: 'granted',
    acknowledged: { ...acknowledgement },
    grant: { id: 'grant-1', version: '1' },
  };
}
export function handoffFixture(): HandoffSnapshot {
  return {
    target: {
      scope: { ...permissionFixture().target.scope },
      runVersion: 3,
      handoffId: 'handoff-1',
      version: 'h1',
      from: 'agent-a',
      to: 'agent-b',
      ownershipVersion: 'owner-1',
      snapshotVersion: 'snapshot-1',
      context: {
        id: 'context-1',
        version: 'c1',
        sourceId: 'source-1',
        sourceVersion: 'source-v1',
        providedBy: 'agent-a',
      },
      scopes: ['workspace:read'],
      accessVersion: 'access-1',
      expiresAt: '2099-10-01T12:00:00Z',
    },
    status: 'requested',
    freshness: 'current',
    ownership: {
      state: 'acknowledged',
      ownerId: 'agent-a',
      version: 'owner-1',
      acknowledged: { ...acknowledgement },
    },
    access: {
      state: 'available',
      version: 'access-1',
      subjectId: 'agent-b',
      checkedBy: 'host',
      checkedAt: acknowledgement.at,
    },
    summary: 'Public summary for the recipient',
  };
}
export function handoffCommand(value = handoffFixture()): HandoffDecisionCommand {
  return {
    commandId: 'handoff-command-1',
    target: structuredClone(value.target),
    decision: 'accept',
  };
}
export function handoffReceipt(command = handoffCommand()): HandoffReceipt {
  return {
    command: structuredClone(command),
    outcome: 'applied',
    decision: 'accept',
    ownerId: 'agent-b',
    ownershipVersion: 'owner-2',
    acknowledged: { by: 'agent-b', at: acknowledgement.at },
    context: structuredClone(command.target.context),
    accessVersion: command.target.accessVersion,
  };
}
