import {
  inspectPermissionCommand,
  validatePermissionDecision,
  type PermissionDecisionCommand,
  type PermissionSnapshot,
  type PermissionSubmission,
} from '@stackunseen/ui';
import type {
  ApprovalDecision,
  ApprovalProposal,
  SubmissionState,
  ToolCallData,
} from '@stackunseen/ui-core';
import type { AdapterCommand, AdapterReceipt, AdapterScope } from '@stackunseen/ui-core/adapter';

// Fixed fixture clock. Only explicit events advance this simulated host.
export const ACTION_NOW = Date.parse('2026-10-05T12:00:00Z');
const FUTURE = '2099-10-05T12:00:00Z';
const ACK = { by: 'simulated-host', at: '2026-10-05T12:00:00Z' };

export interface ActionBinding {
  proposal: ApprovalProposal;
  scope: AdapterScope;
  runVersion: number;
  subjectId: string;
  resourceVersion: string;
  accessVersion: string;
}
export type ActionCommand = AdapterCommand & {
  payload: ApprovalDecision & {
    toolCallId: string;
    resource: string;
    scopes: string[];
    expiresAt: string;
    subjectId: string;
    resourceVersion: string;
    accessVersion: string;
  };
};
export interface ExecutionReceipt {
  command: ActionCommand;
  outcome: 'succeeded' | 'partial-failure';
  acknowledged: typeof ACK;
  effects: readonly { resource: string; outcome: 'applied' | 'failed'; detail: string }[];
}
type DecisionRecord =
  | { state: 'idle' }
  | { state: Exclude<SubmissionState, 'idle'>; original: ActionCommand; receipt?: AdapterReceipt };

export interface ActionHost {
  reviewed: ActionBinding;
  current: ActionBinding;
  permission: PermissionSnapshot;
  permissionSubmission: PermissionSubmission;
  decision: DecisionRecord;
  // Authority and visible projection remain separate when acknowledgement is lost.
  acceptedReceipt?: AdapterReceipt;
  storedResult?: ExecutionReceipt;
  result?: ExecutionReceipt;
  tool: ToolCallData;
  executions: number;
  now: number;
  notice: string;
}
export type ActionEvent =
  | { type: 'permission-submit'; original: PermissionDecisionCommand }
  | { type: 'permission-accept' }
  | { type: 'decision-submit'; decision: ApprovalDecision['decision']; proposal: ApprovalProposal }
  | { type: 'decision-accept'; loseAcknowledgement?: boolean }
  | { type: 'lookup-decision'; notFound?: boolean }
  | { type: 'change'; field: 'version' | 'scope' | 'resource' | 'access' | 'expiry' }
  | { type: 'review-current' }
  | { type: 'execute' }
  | { type: 'finish'; partial?: boolean; loseAcknowledgement?: boolean }
  | { type: 'lookup-result' };

function immutable<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(immutable);
    Object.freeze(value);
  }
  return value;
}
function copy<T>(value: T): T {
  return immutable(structuredClone(value));
}
function commandFor(action: ActionBinding, decision: ApprovalDecision['decision']): ActionCommand {
  const commandId = `archive-decision-v${action.proposal.version}-r${action.runVersion}`;
  const approval: ApprovalDecision = {
    commandId,
    proposalId: action.proposal.id,
    version: action.proposal.version,
    actionDigest: action.proposal.actionDigest,
    decision,
  };
  return copy({
    commandId,
    scope: action.scope,
    expectedRunVersion: action.runVersion,
    operation: 'action.decide',
    payload: {
      ...approval,
      toolCallId: action.proposal.toolCallId,
      resource: action.proposal.target,
      scopes: action.proposal.scopes,
      expiresAt: action.proposal.expiresAt,
      subjectId: action.subjectId,
      resourceVersion: action.resourceVersion,
      accessVersion: action.accessVersion,
    },
  });
}
function sameCommand(a: ActionCommand, b: ActionCommand) {
  return JSON.stringify(a) === JSON.stringify(b);
}
export function isReviewCurrent(host: ActionHost): boolean {
  return sameCommand(commandFor(host.reviewed, 'approve'), commandFor(host.current, 'approve'));
}
function permissionCovers(host: ActionHost): boolean {
  const { permission, current } = host;
  return (
    permission.status === 'granted' &&
    permission.freshness === 'current' &&
    !!permission.grant &&
    permission.target.subjectId === current.subjectId &&
    permission.target.resource === current.proposal.target &&
    permission.target.accessVersion === current.accessVersion &&
    JSON.stringify(permission.target.scope) === JSON.stringify(current.scope) &&
    JSON.stringify(permission.target.scopes) === JSON.stringify(current.proposal.scopes) &&
    host.now < Date.parse(permission.target.expiresAt)
  );
}
function authorizes(host: ActionHost, original: ActionCommand): boolean {
  return (
    sameCommand(original, commandFor(host.current, original.payload.decision)) &&
    host.current.proposal.status === 'pending' &&
    host.now < Date.parse(host.current.proposal.expiresAt) &&
    permissionCovers(host)
  );
}
export function canExecute(host: ActionHost): boolean {
  return (
    host.decision.state === 'acknowledged' &&
    host.decision.original.payload.decision === 'approve' &&
    host.acceptedReceipt?.outcome === 'accepted' &&
    sameCommand(host.decision.original, host.acceptedReceipt.command as ActionCommand) &&
    authorizes(host, host.decision.original) &&
    host.executions === 0
  );
}
export function createActionHost(): ActionHost {
  const scope: AdapterScope = {
    workspaceId: 'demo-operations',
    threadId: 'archive-review',
    branchId: 'main',
    runId: 'archive-run',
    attemptId: 'attempt-1',
    streamId: 'archive-stream',
    schemaVersion: 2,
  };
  const current: ActionBinding = {
    scope,
    runVersion: 1,
    subjectId: 'operations-reviewer',
    resourceVersion: 'records-7',
    accessVersion: 'access-3',
    proposal: {
      id: 'archive-proposal',
      version: 1,
      runId: scope.runId,
      toolCallId: 'archive-call-1',
      actionDigest: 'simulated:archive:AC-104,AC-108:v1',
      title: 'Archive two closed accounts',
      target: 'Demo CRM / closed accounts',
      scopes: ['accounts:archive'],
      impact: 'AC-104 and AC-108 leave the active list. Their history stays available.',
      expiresAt: FUTURE,
      risk: 'medium',
      status: 'pending',
    },
  };
  return copy({
    reviewed: current,
    current,
    permission: {
      target: {
        scope,
        runVersion: 1,
        requestId: 'archive-access',
        version: 'permission-1',
        subjectId: current.subjectId,
        resource: current.proposal.target,
        scopes: current.proposal.scopes,
        accessVersion: current.accessVersion,
        expiresAt: FUTURE,
      },
      status: 'requested',
      freshness: 'current',
      access: {
        state: 'available',
        version: current.accessVersion,
        subjectId: current.subjectId,
        checkedBy: ACK.by,
        checkedAt: ACK.at,
      },
    },
    permissionSubmission: { state: 'idle' },
    decision: { state: 'idle' },
    tool: {
      id: current.proposal.toolCallId,
      name: 'Archive closed accounts',
      revision: 1,
      state: 'approval-required',
      input: 'AC-104 · AC-108\nResource revision: records-7\nScope: accounts:archive',
    },
    executions: 0,
    now: ACTION_NOW,
    notice: 'Review access, then approve the exact action. Nothing has executed.',
  });
}

/** In-memory simulation only. No networking, persistence, authentication or live effects. */
export function actionHostEvent(host: ActionHost, event: ActionEvent): ActionHost {
  let next: ActionHost = host;
  switch (event.type) {
    case 'permission-submit': {
      const original = inspectPermissionCommand(event.original);
      if (
        host.permissionSubmission.state !== 'idle' ||
        !original ||
        !validatePermissionDecision(host.permission, original, host.now)
      )
        return host;
      next = {
        ...host,
        permissionSubmission: { state: 'submitting', original },
        notice: 'Access decision submitted. The server has not accepted it.',
      };
      break;
    }
    case 'permission-accept': {
      if (host.permissionSubmission.state !== 'submitting') return host;
      const { original } = host.permissionSubmission;
      if (!validatePermissionDecision(host.permission, original, host.now)) {
        next = {
          ...host,
          permissionSubmission: {
            state: 'failed',
            original,
            receipt: { command: original, outcome: 'rejected' },
          },
          notice: 'The server rejected stale access. No action can execute.',
        };
        break;
      }
      const granted = original.decision === 'allow';
      const grant = { id: 'archive-grant', version: host.current.accessVersion };
      next = {
        ...host,
        permission: {
          ...host.permission,
          status: granted ? 'granted' : 'denied',
          ...(granted ? { grant: { ...grant, acknowledged: ACK } } : {}),
        },
        permissionSubmission: {
          state: 'acknowledged',
          original,
          receipt: {
            command: original,
            outcome: 'applied',
            permission: granted ? 'granted' : 'denied',
            acknowledged: ACK,
            ...(granted ? { grant } : {}),
          },
        },
        notice: granted
          ? 'The server confirmed access. The action still needs a separate approval.'
          : 'Access denied. Nothing has executed.',
      };
      break;
    }
    case 'decision-submit': {
      if (
        host.decision.state !== 'idle' ||
        !permissionCovers(host) ||
        !isReviewCurrent(host) ||
        host.now >= Date.parse(host.reviewed.proposal.expiresAt) ||
        JSON.stringify(event.proposal) !== JSON.stringify(host.reviewed.proposal)
      )
        return host;
      const original = commandFor(host.reviewed, event.decision);
      next = {
        ...host,
        decision: { state: 'submitting', original },
        notice: 'Decision submitted. Approval and execution are still unconfirmed.',
      };
      break;
    }
    case 'decision-accept': {
      if (host.decision.state !== 'submitting' || host.acceptedReceipt) return host;
      const { original } = host.decision;
      const accepted = authorizes(host, original);
      const receipt: AdapterReceipt = {
        command: original,
        outcome: accepted ? 'accepted' : 'rejected',
        detail: accepted
          ? 'Decision received for the exact current action.'
          : 'Action scope, version, access or expiry no longer matches.',
      };
      next = {
        ...host,
        acceptedReceipt: receipt,
        decision: event.loseAcknowledgement
          ? { state: 'outcome-unknown', original }
          : { state: accepted ? 'acknowledged' : 'failed', original, receipt },
        tool: {
          ...host.tool,
          state: accepted && original.payload.decision === 'approve' ? 'queued' : 'denied',
        },
        notice: event.loseAcknowledgement
          ? 'Decision acknowledgement lost. Look up the retained original; do not resend.'
          : accepted
            ? 'The server accepted the decision. Nothing has executed.'
            : 'The server rejected the stale decision. Nothing has executed.',
      };
      break;
    }
    case 'lookup-decision': {
      if (host.decision.state === 'idle' || host.decision.state === 'submitting') return host;
      const { original } = host.decision;
      const receipt: AdapterReceipt =
        !event.notFound &&
        host.acceptedReceipt &&
        sameCommand(original, host.acceptedReceipt.command as ActionCommand)
          ? host.acceptedReceipt
          : { command: original, outcome: 'not-found' };
      next = {
        ...host,
        decision: {
          state:
            receipt.outcome === 'accepted'
              ? 'acknowledged'
              : receipt.outcome === 'rejected'
                ? 'failed'
                : 'outcome-unknown',
          original,
          receipt,
        },
        notice:
          receipt.outcome === 'not-found'
            ? 'No matching receipt found. Outcome remains unknown; lookup never resends.'
            : 'Original decision reconciled. Execution is reported separately.',
      };
      break;
    }
    case 'change': {
      if (host.executions !== 0) return host;
      const current = structuredClone(host.current);
      current.runVersion += 1;
      if (event.field === 'version') {
        current.proposal.version += 1;
        current.proposal.actionDigest = `simulated:archive:AC-104,AC-108:v${current.proposal.version}`;
      }
      if (event.field === 'scope')
        current.proposal.scopes = ['accounts:archive', 'accounts:export'];
      if (event.field === 'resource') current.resourceVersion = 'records-8';
      if (event.field === 'access') current.accessVersion = 'access-4';
      if (event.field === 'expiry') current.proposal.expiresAt = '2026-10-05T11:59:00Z';
      next = {
        ...host,
        current,
        notice: 'The current server action changed. The old approval cannot authorize it.',
      };
      break;
    }
    case 'review-current': {
      if (
        host.executions !== 0 ||
        (host.decision.state !== 'idle' && host.acceptedReceipt?.outcome !== 'rejected')
      )
        return host;
      const current = structuredClone(host.current);
      if (host.now >= Date.parse(current.proposal.expiresAt)) {
        current.proposal.version += 1;
        current.runVersion += 1;
        current.proposal.expiresAt = FUTURE;
      }
      next = {
        ...host,
        reviewed: current,
        current,
        decision: { state: 'idle' },
        acceptedReceipt: undefined,
        permission: {
          ...host.permission,
          target: {
            ...host.permission.target,
            scope: current.scope,
            runVersion: current.runVersion,
            version: `permission-${current.runVersion}`,
            scopes: current.proposal.scopes,
            accessVersion: current.accessVersion,
          },
          status: 'requested',
          grant: undefined,
          access: { ...host.permission.access, version: current.accessVersion },
        },
        permissionSubmission: { state: 'idle' },
        tool: { ...host.tool, state: 'approval-required' },
        notice:
          'Current action loaded. Review and request its exact access before making a new decision.',
      };
      break;
    }
    case 'execute': {
      if (!canExecute(host)) return host;
      next = {
        ...host,
        executions: 1,
        tool: { ...host.tool, state: 'running' },
        notice: 'Simulated execution started once. A server result is still pending.',
      };
      break;
    }
    case 'finish': {
      if (host.tool.state !== 'running' || host.storedResult || host.decision.state === 'idle')
        return host;
      const result: ExecutionReceipt = {
        command: host.decision.original,
        outcome: event.partial ? 'partial-failure' : 'succeeded',
        acknowledged: ACK,
        effects: [
          { resource: 'AC-104', outcome: 'applied', detail: 'Archived in the simulated server.' },
          {
            resource: 'AC-108',
            outcome: event.partial ? 'failed' : 'applied',
            detail: event.partial
              ? 'Record revision changed. No change applied to this account.'
              : 'Archived in the simulated server.',
          },
        ],
      };
      next = {
        ...host,
        storedResult: result,
        result: event.loseAcknowledgement ? undefined : result,
        tool: {
          ...host.tool,
          state: event.loseAcknowledgement
            ? 'outcome-unknown'
            : event.partial
              ? 'failed'
              : 'succeeded',
          output: event.loseAcknowledgement
            ? undefined
            : event.partial
              ? 'AC-104 archived. AC-108 unchanged.'
              : 'AC-104 and AC-108 archived.',
          error:
            !event.loseAcknowledgement && event.partial
              ? 'Partial failure: AC-108 needs a new review. Applied effects are retained.'
              : undefined,
        },
        notice: event.loseAcknowledgement
          ? 'Result acknowledgement lost. Check the original execution receipt before any retry.'
          : event.partial
            ? 'Partial failure recorded. One effect applied; one account is unchanged.'
            : 'Server result received. Both simulated effects are confirmed.',
      };
      break;
    }
    case 'lookup-result': {
      if (
        !host.storedResult ||
        host.decision.state === 'idle' ||
        !sameCommand(host.storedResult.command, host.decision.original)
      )
        return host;
      const result = host.storedResult;
      next = {
        ...host,
        result,
        tool: {
          ...host.tool,
          state: result.outcome === 'succeeded' ? 'succeeded' : 'failed',
          output: result.effects
            .map((effect) => `${effect.resource}: ${effect.outcome}`)
            .join('\n'),
          error:
            result.outcome === 'partial-failure'
              ? 'Partial failure confirmed by the original receipt.'
              : undefined,
        },
        notice: 'Original execution receipt found. Lookup did not execute the action again.',
      };
      break;
    }
  }
  return copy(next);
}
