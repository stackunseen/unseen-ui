import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ApprovalProposal } from '@stackunseen/ui-core';
import { ScopeGrantList } from './scope-grant-list.js';
import type { ScopeGrant } from './scope-grant-list.js';
import { DryRunPreview } from './dry-run-preview.js';
import type { DryRunPlan } from './dry-run-preview.js';
import { ApprovalBatch } from './approval-batch.js';

const now = '2026-10-16T10:00:00Z';
const grants: ScopeGrant[] = [
  {
    id: 'g1',
    version: 2,
    scopes: ['accounts:read', 'accounts:archive'],
    target: 'CRM sandbox',
    grantedAt: '2026-10-16T09:00:00Z',
    grantedBy: 'Priya',
    expiresAt: '2026-10-16T12:00:00Z',
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
    grantedAt: '2026-10-15T09:00:00Z',
    expiresAt: '2026-10-16T09:30:00Z',
    status: 'active',
  },
  {
    id: 'g3',
    version: 1,
    scopes: ['files:write'],
    target: 'Repo',
    grantedAt: '2026-10-15T09:00:00Z',
    status: 'revoked',
  },
];

describe('ScopeGrantList', () => {
  it('shows scope, expiry from the host clock, uses and a revoke that waits for the receipt', async () => {
    const user = userEvent.setup();
    const onRevoke = vi.fn();
    const { rerender } = render(<ScopeGrantList grants={grants} now={now} onRevoke={onRevoke} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Expires in 2 h');
    expect(items[0]).toHaveTextContent('Used 3 of 10 times');
    expect(items[0]).toHaveTextContent('From approval approval-1');
    expect(
      within(items[0]!).getByRole('group', { name: 'Scopes for CRM sandbox' }),
    ).toHaveTextContent('accounts:archive');
    expect(items[1]).toHaveAttribute('data-status', 'expired');
    expect(within(items[1]!).queryByRole('button')).toBeNull();
    expect(items[2]).toHaveTextContent('Revoked');
    await user.click(screen.getByRole('button', { name: 'Revoke access to CRM sandbox' }));
    expect(onRevoke).toHaveBeenCalledWith({ grantId: 'g1', version: 2 });
    rerender(
      <ScopeGrantList
        grants={grants}
        now={now}
        onRevoke={onRevoke}
        receipts={[{ commandId: 'g1', status: 'submitting' }]}
      />,
    );
    expect(screen.getAllByRole('listitem')[0]).toHaveAttribute('data-status', 'revoking');
    expect(screen.queryByRole('button', { name: 'Revoke access to CRM sandbox' })).toBeNull();
    expect(screen.getByText('Revoke requested. Waiting for confirmation.')).toBeInTheDocument();
    rerender(<ScopeGrantList grants={[]} now={now} />);
    expect(screen.getByRole('status')).toHaveTextContent('No standing permissions.');
  });
});

const plan: DryRunPlan = {
  id: 'plan-1',
  version: 3,
  title: 'Archive inactive accounts',
  summary: 'Three accounts and one notification.',
  effects: [
    {
      id: 'e1',
      kind: 'record',
      label: 'Archive 3 accounts',
      target: 'CRM sandbox',
      reversible: true,
    },
    { id: 'e2', kind: 'message', label: 'Email 3 owners', target: 'Mail relay', reversible: false },
    { id: 'e3', kind: 'external', label: 'Post to #ops', target: 'Chat', reversible: 'unknown' },
  ],
};

describe('DryRunPreview', () => {
  it('lets each effect be skipped and sends one versioned decision', async () => {
    const user = userEvent.setup();
    const onSkippedChange = vi.fn();
    const onDecision = vi.fn();
    const { rerender } = render(
      <DryRunPreview
        plan={plan}
        skippedIds={[]}
        onSkippedChange={onSkippedChange}
        onDecision={onDecision}
      />,
    );
    expect(
      screen.getByText(
        /Nothing has run\. 3 of 3 effects would run, 1 cannot be undone, 1 with unknown reversibility\./,
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Skip: Email 3 owners' }));
    expect(onSkippedChange).toHaveBeenCalledWith(['e2']);
    rerender(
      <DryRunPreview
        plan={plan}
        skippedIds={['e2']}
        onSkippedChange={onSkippedChange}
        onDecision={onDecision}
      />,
    );
    expect(
      screen.getByText(/2 of 3 effects would run, 1 with unknown reversibility\./),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Run 2 effects' }));
    expect(onDecision).toHaveBeenCalledWith({
      planId: 'plan-1',
      version: 3,
      decision: 'run',
      skippedIds: ['e2'],
    });
    rerender(
      <DryRunPreview
        plan={plan}
        skippedIds={['e2']}
        onSkippedChange={onSkippedChange}
        onDecision={onDecision}
        submission="submitting"
      />,
    );
    expect(screen.getByRole('button', { name: 'Run 2 effects' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Skip: Email 3 owners' })).toBeDisabled();
    rerender(
      <DryRunPreview
        plan={plan}
        skippedIds={[]}
        onSkippedChange={onSkippedChange}
        onDecision={onDecision}
        stale
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('newer version of this plan');
    expect(screen.getByRole('button', { name: 'Run plan' })).toBeDisabled();
  });
});

const proposal = (id: string, extra: Partial<ApprovalProposal> = {}): ApprovalProposal => ({
  id,
  version: 1,
  runId: 'run-1',
  toolCallId: `tc-${id}`,
  actionDigest: `digest-${id}`,
  title: `Send reminder ${id}`,
  target: 'Mail relay',
  scopes: ['mail:send'],
  impact: 'One email.',
  expiresAt: '2030-01-01T00:00:00.000Z',
  risk: 'low',
  status: 'pending',
  ...extra,
});

describe('ApprovalBatch', () => {
  it('covers only pending, included, same-scope proposals and reports what the receipt confirmed', async () => {
    const user = userEvent.setup();
    const onDecision = vi.fn();
    const onExcludedChange = vi.fn();
    const proposals = [
      proposal('a'),
      proposal('b'),
      proposal('c', { status: 'superseded' }),
      proposal('d', { expiresAt: '2026-10-16T09:00:00Z' }),
    ];
    const { rerender } = render(
      <ApprovalBatch
        proposals={proposals}
        excludedIds={[]}
        onExcludedChange={onExcludedChange}
        onDecision={onDecision}
        now={now}
      />,
    );
    expect(screen.getByRole('heading', { name: /Approve together/ })).toHaveTextContent('2');
    const rows = screen.getAllByRole('listitem');
    expect(rows[2]).toHaveAttribute('data-dropped');
    expect(rows[2]).toHaveTextContent('Already superseded; left out of the batch');
    expect(rows[3]).toHaveTextContent('Expired; left out of the batch');
    expect(screen.getByRole('checkbox', { name: 'Include: Send reminder c' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: 'Include: Send reminder b' }));
    expect(onExcludedChange).toHaveBeenCalledWith(['b']);
    rerender(
      <ApprovalBatch
        proposals={proposals}
        excludedIds={['b']}
        onExcludedChange={onExcludedChange}
        onDecision={onDecision}
        now={now}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Approve 1' }));
    expect(onDecision).toHaveBeenCalledWith({
      decision: 'approve',
      items: [{ proposalId: 'a', version: 1, actionDigest: 'digest-a' }],
    });
    rerender(
      <ApprovalBatch
        proposals={proposals}
        excludedIds={['b']}
        onExcludedChange={onExcludedChange}
        onDecision={onDecision}
        now={now}
        submission="acknowledged"
        receipt={{ commandId: 'batch-1', status: 'acknowledged', covered: ['a'] }}
      />,
    );
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Included in the confirmation');
    expect(screen.getByRole('button', { name: 'Approve 1' })).toBeDisabled();
  });

  it('refuses to decide proposals that do not share one target and scope', () => {
    render(
      <ApprovalBatch
        proposals={[proposal('a'), proposal('b', { target: 'CRM', scopes: ['accounts:archive'] })]}
        excludedIds={[]}
        onExcludedChange={() => {}}
        onDecision={() => {}}
        now={now}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('cannot be decided together');
    expect(screen.getByRole('button', { name: 'Approve 2' })).toBeDisabled();
  });
});
