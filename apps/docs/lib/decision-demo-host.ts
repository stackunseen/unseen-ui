import {
  inspectPermissionReceipt,
  inspectHandoffReceipt,
  validatePermissionDecision,
  validateHandoffDecision,
} from '@stackunseen/ui';
import type {
  HandoffDecisionCommand,
  HandoffReceipt,
  HandoffSnapshot,
  HandoffSubmission,
  PermissionDecisionCommand,
  PermissionReceipt,
  PermissionSnapshot,
  PermissionSubmission,
} from '@stackunseen/ui';

export interface PermissionDemo {
  value: PermissionSnapshot;
  snapshot: PermissionSnapshot;
  submission: PermissionSubmission;
  storedReceipt?: PermissionReceipt;
  executions: number;
}
export interface HandoffDemo {
  value: HandoffSnapshot;
  snapshot: HandoffSnapshot;
  submission: HandoffSubmission;
  storedReceipt?: HandoffReceipt;
  executions: number;
}

function applyPermission(
  value: PermissionSnapshot,
  command: PermissionDecisionCommand,
): PermissionSnapshot {
  return {
    ...value,
    status: command.decision === 'allow' ? 'granted' : 'denied',
    ...(command.decision === 'allow'
      ? { grant: { id: 'demo-grant', version: 'grant-v1', acknowledged: acknowledgement } }
      : {}),
  };
}
function applyHandoff(
  value: HandoffSnapshot,
  receipt: Extract<HandoffReceipt, { outcome: 'applied' }>,
): HandoffSnapshot {
  return {
    ...value,
    status: receipt.decision === 'accept' ? 'accepted' : 'declined',
    ownership: {
      state: 'acknowledged',
      ownerId: receipt.ownerId,
      version: receipt.ownershipVersion,
      acknowledged: receipt.acknowledged,
    },
  };
}

/** One local fixture command. Commit once, store its receipt, then deliver or withhold the response. */
export function executePermission(host: PermissionDemo, withhold: boolean): PermissionDemo {
  if (host.submission.state !== 'submitting') return host;
  const original = host.submission.original;
  let snapshot = host.snapshot;
  let storedReceipt = inspectPermissionReceipt(original, host.storedReceipt);
  let executions = host.executions;
  if (!storedReceipt) {
    if (validatePermissionDecision(snapshot, original, Date.now())) {
      snapshot = applyPermission(snapshot, original);
      storedReceipt = permissionReceipt(original);
      executions += 1;
    } else
      storedReceipt = {
        command: original,
        outcome: 'rejected',
        detail: 'The current sample host request no longer matches.',
      };
  }
  return {
    ...host,
    snapshot,
    storedReceipt,
    executions,
    value: withhold ? { ...host.value, freshness: 'unknown' } : snapshot,
    submission: withhold
      ? { state: 'outcome-unknown', original }
      : { state: 'acknowledged', original, receipt: storedReceipt },
  };
}
export function executeHandoff(host: HandoffDemo, withhold: boolean): HandoffDemo {
  if (host.submission.state !== 'submitting') return host;
  const original = host.submission.original;
  let snapshot = host.snapshot;
  let storedReceipt = inspectHandoffReceipt(original, host.storedReceipt);
  let executions = host.executions;
  if (!storedReceipt) {
    if (validateHandoffDecision(snapshot, original, Date.now())) {
      const applied = handoffReceipt(original);
      snapshot = applyHandoff(snapshot, applied);
      storedReceipt = applied;
      executions += 1;
    } else
      storedReceipt = {
        command: original,
        outcome: 'rejected',
        detail: 'The current sample host transfer no longer matches.',
      };
  }
  return {
    ...host,
    snapshot,
    storedReceipt,
    executions,
    value: withhold ? { ...host.value, freshness: 'unknown' } : snapshot,
    submission: withhold
      ? { state: 'outcome-unknown', original }
      : { state: 'acknowledged', original, receipt: storedReceipt },
  };
}

/** Lookup never writes the simulated resource, changes the observed snapshot, or executes a command. */
export function lookupPermission(
  host: PermissionDemo,
  original: PermissionDecisionCommand,
): PermissionDemo {
  const receipt = inspectPermissionReceipt(original, host.storedReceipt) ?? {
    command: original,
    outcome: 'not-found' as const,
  };
  return { ...host, submission: { state: 'acknowledged', original, receipt } };
}
export function lookupHandoff(host: HandoffDemo, original: HandoffDecisionCommand): HandoffDemo {
  const receipt = inspectHandoffReceipt(original, host.storedReceipt) ?? {
    command: original,
    outcome: 'not-found' as const,
  };
  return { ...host, submission: { state: 'acknowledged', original, receipt } };
}
const acknowledgement = { by: 'Gallery sample host', at: '2026-10-01T00:00:00Z' };
const scope = {
  workspaceId: 'demo-workspace',
  threadId: 'account-review',
  runId: 'demo-run',
  attemptId: 'attempt-1',
  streamId: 'stream-1',
  schemaVersion: 2 as const,
};
const expiresAt = '2099-10-01T00:00:00Z';
export function permissionFixture(state: string): PermissionDemo {
  const value: PermissionSnapshot = {
    target: {
      scope,
      runVersion: 1,
      requestId: 'crm-access',
      version: 'request-v1',
      subjectId: 'Research agent',
      resource: 'CRM sandbox',
      scopes: ['accounts:read'],
      accessVersion: 'access-v1',
      expiresAt,
    },
    status: 'requested',
    freshness: 'current',
    access: {
      state: 'available',
      version: 'access-v1',
      subjectId: 'Research agent',
      checkedBy: acknowledgement.by,
      checkedAt: acknowledgement.at,
    },
  };
  const original: PermissionDecisionCommand = {
    commandId: 'gallery-permission-1',
    target: structuredClone(value.target),
    decision: state === 'Denied' ? 'deny' : 'allow',
  };
  let submission: PermissionSubmission = { state: 'idle' };
  if (state === 'Pending') submission = { state: 'submitting', original };
  if (['Unknown outcome', 'Scope changed', 'Revoked'].includes(state))
    submission = { state: 'outcome-unknown', original };
  if (state === 'Granted' || state === 'Denied') {
    value.status = state === 'Granted' ? 'granted' : 'denied';
    if (state === 'Granted')
      value.grant = { id: 'demo-grant', version: 'grant-v1', acknowledged: acknowledgement };
    submission = { state: 'acknowledged', original, receipt: permissionReceipt(original) };
  }
  if (state === 'Revoked') {
    value.status = 'revoked';
    value.access.state = 'revoked';
  }
  if (state === 'Stale') value.freshness = 'stale';
  if (state === 'Expired') {
    value.target.expiresAt = '2020-01-01T00:00:00Z';
    value.status = 'expired';
  }
  if (state === 'Scope changed') {
    value.target.version = 'request-v2';
    value.target.scopes = ['accounts:write'];
  }
  if (state === 'Missing scope') value.target.scopes = [];
  if (state === 'Missing resource') value.target.resource = '';
  const snapshot =
    state === 'Unknown outcome' ? applyPermission(value, original) : structuredClone(value);
  if (state === 'Unknown outcome') value.freshness = 'unknown';
  const storedReceipt = [
    'Unknown outcome',
    'Scope changed',
    'Revoked',
    'Granted',
    'Denied',
  ].includes(state)
    ? permissionReceipt(original)
    : undefined;
  return { value, snapshot, submission, storedReceipt, executions: storedReceipt ? 1 : 0 };
}
function permissionReceipt(command: PermissionDecisionCommand): PermissionReceipt {
  return {
    command,
    outcome: 'applied',
    permission: command.decision === 'allow' ? 'granted' : 'denied',
    acknowledged: acknowledgement,
    ...(command.decision === 'allow' ? { grant: { id: 'demo-grant', version: 'grant-v1' } } : {}),
  };
}
export function handoffFixture(state: string): HandoffDemo {
  const value: HandoffSnapshot = {
    target: {
      scope,
      runVersion: 1,
      handoffId: 'review-transfer',
      version: 'request-v1',
      from: 'Implementation agent',
      to: 'Review agent',
      ownershipVersion: 'owner-v1',
      snapshotVersion: 'snapshot-v1',
      context: {
        id: 'change-context',
        version: 'context-v1',
        sourceId: 'change-set',
        sourceVersion: 'revision-4',
        providedBy: 'Implementation agent',
      },
      scopes: ['workspace:read'],
      accessVersion: 'access-v1',
      expiresAt,
    },
    status: 'requested',
    freshness: 'current',
    summary: 'Review two changed files and their recorded test results.',
    ownership: {
      state: 'acknowledged',
      ownerId: 'Implementation agent',
      version: 'owner-v1',
      acknowledged: acknowledgement,
    },
    access: {
      state: 'available',
      version: 'access-v1',
      subjectId: 'Review agent',
      checkedBy: acknowledgement.by,
      checkedAt: acknowledgement.at,
    },
  };
  const original: HandoffDecisionCommand = {
    commandId: 'gallery-handoff-1',
    target: structuredClone(value.target),
    decision: state === 'Declined' ? 'decline' : 'accept',
  };
  let submission: HandoffSubmission = { state: 'idle' };
  if (state === 'Pending') submission = { state: 'submitting', original };
  if (['Unknown outcome', 'Context changed', 'Revoked'].includes(state))
    submission = { state: 'outcome-unknown', original };
  if (state === 'Accepted' || state === 'Declined') {
    value.status = state === 'Accepted' ? 'accepted' : 'declined';
    const receipt = handoffReceipt(original);
    value.ownership = {
      state: 'acknowledged',
      ownerId: receipt.ownerId,
      version: receipt.ownershipVersion,
      acknowledged: receipt.acknowledged,
    };
    submission = { state: 'acknowledged', original, receipt };
  }
  if (state === 'Denied' || state === 'Revoked') {
    value.status = state === 'Denied' ? 'denied' : 'revoked';
    value.access.state = value.status;
  }
  if (state === 'Stale') value.freshness = 'stale';
  if (state === 'Unknown owner') value.ownership = { state: 'unknown' };
  if (state === 'Expired') {
    value.status = 'expired';
    value.target.expiresAt = '2020-01-01T00:00:00Z';
  }
  if (state === 'Context changed') {
    value.target.version = 'request-v2';
    value.target.context = { ...value.target.context, version: 'context-v2' };
  }
  const snapshot =
    state === 'Unknown outcome'
      ? applyHandoff(value, handoffReceipt(original))
      : structuredClone(value);
  if (state === 'Unknown outcome') value.freshness = 'unknown';
  const storedReceipt = [
    'Unknown outcome',
    'Context changed',
    'Revoked',
    'Accepted',
    'Declined',
  ].includes(state)
    ? handoffReceipt(original)
    : undefined;
  return { value, snapshot, submission, storedReceipt, executions: storedReceipt ? 1 : 0 };
}
function handoffReceipt(
  command: HandoffDecisionCommand,
): Extract<HandoffReceipt, { outcome: 'applied' }> {
  return {
    command,
    outcome: 'applied',
    decision: command.decision,
    ownerId: command.decision === 'accept' ? command.target.to : command.target.from,
    ownershipVersion: command.decision === 'accept' ? 'owner-v2' : command.target.ownershipVersion,
    acknowledged: { by: command.target.to, at: acknowledgement.at },
    context: command.target.context,
    accessVersion: command.target.accessVersion,
  };
}
