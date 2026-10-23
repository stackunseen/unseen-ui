import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApprovalCard } from '@stackunseen/ui';

import { proposal } from '../../../../../apps/docs/lib/fixtures';

describe('controlled interactions', () => {
  it('disables an approval when its displayed deadline passes', () => {
    vi.useFakeTimers();
    try {
      const p = { ...proposal, expiresAt: new Date(Date.now() + 1000).toISOString() };
      render(<ApprovalCard proposal={p} submission="idle" onDecision={vi.fn()} />);
      expect(screen.getByText('Review required')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Approve action' })).toBeEnabled();
      act(() => vi.advanceTimersByTime(1001));
      expect(screen.getByText('Proposal expired')).toBeVisible();
      expect(screen.queryByText('Review required')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Approve action' })).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('blocks stale, expired and unknown approvals without inventing a result', async () => {
    const user = userEvent.setup();
    const decide = vi.fn();
    const reconcile = vi.fn();
    const { rerender } = render(
      <ApprovalCard proposal={proposal} submission="idle" stale onDecision={decide} />,
    );
    expect(screen.queryByRole('button', { name: 'Approve action' })).toBeNull();
    rerender(<ApprovalCard proposal={proposal} submission="idle" expired onDecision={decide} />);
    expect(screen.queryByRole('button', { name: 'Approve action' })).toBeNull();
    rerender(
      <ApprovalCard
        proposal={proposal}
        submission="outcome-unknown"
        onDecision={decide}
        onReconcile={reconcile}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Approve action' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check decision status' }));
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(decide).not.toHaveBeenCalled();
  });
});

describe('proposal headings stay aligned with host state', () => {
  it.each([
    ['pending', 'Review required', 'Pending'],
    ['approved', 'Action approved', 'Approved'],
    ['rejected', 'Action rejected', 'Rejected'],
    ['expired', 'Proposal expired', 'Expired'],
    ['superseded', 'Proposal changed', 'Changed'],
  ] as const)(
    'labels a %s proposal without treating approval as execution',
    (status, heading, badge) => {
      render(
        <ApprovalCard
          proposal={{ ...proposal, status }}
          submission="acknowledged"
          expired={false}
          onDecision={vi.fn()}
        />,
      );
      expect(screen.getByText(heading)).toBeVisible();
      expect(screen.getByText(badge)).toBeVisible();
      expect(
        screen.getByText('Decision received. Whether the action ran is shown separately.'),
      ).toBeVisible();
      if (status !== 'pending') expect(screen.queryByText('Review required')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Approve action' })).toBeNull();
    },
  );

  it.each(['submitting', 'acknowledged', 'failed', 'outcome-unknown'] as const)(
    'does not infer approval from %s submission',
    (submission) => {
      render(
        <ApprovalCard
          proposal={proposal}
          submission={submission}
          expired={false}
          onDecision={vi.fn()}
          onReconcile={vi.fn()}
        />,
      );
      expect(screen.getByText('Review required')).toBeVisible();
      expect(screen.getByText('Pending')).toBeVisible();
      expect(screen.queryByText('Action approved')).toBeNull();
      if (submission === 'outcome-unknown') {
        expect(screen.getByRole('button', { name: 'Check decision status' })).toBeEnabled();
        expect(screen.queryByRole('button', { name: 'Approve action' })).toBeNull();
        expect(screen.getByText(/Your decision may already have arrived/)).toBeVisible();
      }
    },
  );

  it.each(['pending', 'approved', 'rejected'] as const)(
    'keeps a stale %s proposal changed',
    (status) => {
      render(
        <ApprovalCard
          proposal={{ ...proposal, status }}
          submission="idle"
          stale
          expired
          onDecision={vi.fn()}
        />,
      );
      expect(screen.getByText('Proposal changed')).toBeVisible();
      expect(screen.getByText('Changed')).toBeVisible();
      expect(screen.queryByText('Action approved')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Approve action' })).toBeNull();
    },
  );

  it('does not revoke a reported approval because its review deadline passed', () => {
    render(
      <ApprovalCard
        proposal={{ ...proposal, status: 'approved' }}
        submission="acknowledged"
        expired
        onDecision={vi.fn()}
      />,
    );
    expect(screen.getByText('Action approved')).toBeVisible();
    expect(screen.getByText('Approved')).toBeVisible();
    expect(screen.queryByText('Proposal expired')).toBeNull();
  });
});
