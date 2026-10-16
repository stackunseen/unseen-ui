'use client';
import { useState } from 'react';
import { resolveVariant } from '@stackunseen/ui';
import type { CommandReceipt, SubmissionState } from '@stackunseen/ui-core';
import { ApprovalBatch, DryRunPreview, ScopeGrantList } from '@stackunseen/ui/conversation-flow';
import type { ScopeGrant } from '@stackunseen/ui/conversation-flow';
import '@stackunseen/ui/conversation-flow.css';
import { proposal } from '../lib/fixtures';

const now = '2026-10-16T10:00:00.000Z';
const grants: ScopeGrant[] = [
  {
    id: 'g1',
    version: 2,
    scopes: ['accounts:read', 'accounts:archive'],
    target: 'CRM sandbox · Demo workspace',
    grantedAt: '2026-10-16T09:04:00.000Z',
    grantedBy: 'Priya',
    expiresAt: '2026-10-16T12:00:00.000Z',
    uses: { kind: 'measured', value: 3 },
    maxUses: 10,
    status: 'active',
    sourceProposalId: 'approval-1',
  },
  {
    id: 'g2',
    version: 1,
    scopes: ['mail:send'],
    target: 'Mail relay',
    grantedAt: '2026-10-15T09:00:00.000Z',
    expiresAt: '2026-10-16T09:30:00.000Z',
    status: 'active',
  },
  {
    id: 'g3',
    version: 1,
    scopes: ['files:write'],
    target: 'Repository',
    grantedAt: '2026-10-14T09:00:00.000Z',
    uses: { kind: 'unknown', reason: 'the host does not count file writes' },
    status: 'active',
  },
];

export function GovernanceSpecimen({
  name,
  state,
  presentation,
  onNotice,
}: {
  name: 'ScopeGrant' | 'DryRunPreview' | 'ApprovalBatch';
  state: string;
  presentation?: string;
  onNotice: (text: string) => void;
}) {
  const [receipts, setReceipts] = useState<CommandReceipt[]>([]);
  const [skipped, setSkipped] = useState<string[]>(state === 'Some skipped' ? ['e2'] : []);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [submission, setSubmission] = useState<SubmissionState>(
    state === 'Acknowledged' ? 'acknowledged' : state === 'Sending' ? 'submitting' : 'idle',
  );
  if (name === 'ScopeGrant')
    return (
      <ScopeGrantList
        variant={resolveVariant('ScopeGrant', presentation)}
        grants={state === 'Empty' ? [] : grants}
        now={now}
        receipts={receipts}
        onRevoke={(request) => {
          setReceipts([{ commandId: request.grantId, status: 'submitting' }]);
          onNotice(
            `Revoke requested for ${request.grantId} (version ${request.version}). Waiting for the host.`,
          );
        }}
      />
    );
  if (name === 'DryRunPreview')
    return (
      <DryRunPreview
        variant={resolveVariant('DryRunPreview', presentation)}
        plan={{
          id: 'plan-7',
          version: state === 'Plan changed' ? 4 : 3,
          title: 'Archive inactive accounts',
          summary:
            'Three accounts become read-only, their owners are told, and the ops channel gets a note.',
          effects: [
            {
              id: 'e1',
              kind: 'record',
              label: 'Archive 3 accounts',
              target: 'CRM sandbox',
              reversible: true,
              detail: 'An administrator can restore them.',
            },
            {
              id: 'e2',
              kind: 'message',
              label: 'Email 3 account owners',
              target: 'Mail relay',
              reversible: false,
            },
            {
              id: 'e3',
              kind: 'external',
              label: 'Post a summary to #ops',
              target: 'Chat connector',
              reversible: 'unknown',
            },
          ],
        }}
        skippedIds={skipped}
        onSkippedChange={setSkipped}
        submission={submission}
        stale={state === 'Plan changed'}
        receipt={
          submission === 'acknowledged'
            ? {
                commandId: 'plan-7',
                status: 'acknowledged',
                message: 'The host queued the plan as run plan-7-r1.',
              }
            : undefined
        }
        onDecision={(decision) => {
          setSubmission('submitting');
          onNotice(
            `${decision.decision === 'run' ? 'Run' : 'Cancel'} requested for ${decision.planId} v${decision.version}, skipping ${decision.skippedIds.length}. Waiting for the host.`,
          );
          window.setTimeout(() => setSubmission('acknowledged'), 900);
        }}
      />
    );
  const proposals = [
    {
      ...proposal,
      id: 'approval-a',
      title: 'Archive Acme Sandbox',
      impact: 'One account becomes read-only.',
    },
    {
      ...proposal,
      id: 'approval-b',
      title: 'Archive Example Studio',
      impact: 'One account becomes read-only.',
    },
    {
      ...proposal,
      id: 'approval-c',
      title: 'Archive Demo Works',
      impact: 'One account becomes read-only.',
      status: state === 'One superseded' ? ('superseded' as const) : ('pending' as const),
    },
    ...(state === 'Mixed scopes'
      ? [
          {
            ...proposal,
            id: 'approval-d',
            title: 'Email the owners',
            target: 'Mail relay',
            scopes: ['mail:send'],
            impact: 'Three emails.',
          },
        ]
      : []),
  ];
  return (
    <ApprovalBatch
      variant={resolveVariant('ApprovalBatch', presentation)}
      proposals={proposals}
      excludedIds={excluded}
      onExcludedChange={setExcluded}
      now={now}
      submission={submission}
      receipt={
        submission === 'acknowledged'
          ? {
              commandId: 'batch-1',
              status: 'acknowledged',
              covered: proposals
                .filter((item) => item.status === 'pending' && !excluded.includes(item.id))
                .map((item) => item.id),
              message: 'The host applied the decision to the covered proposals.',
            }
          : undefined
      }
      onDecision={(decision) => {
        setSubmission('submitting');
        onNotice(
          `${decision.decision} requested for ${decision.items.length} proposals. Waiting for the host.`,
        );
        window.setTimeout(() => setSubmission('acknowledged'), 900);
      }}
    />
  );
}
