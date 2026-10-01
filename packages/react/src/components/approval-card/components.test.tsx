import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApprovalCard } from '@ai-interaction/react';

import { proposal } from '../../../../../apps/docs/lib/fixtures';

describe('controlled interactions', () => {
  it('disables an approval when its displayed deadline passes', () => {
    vi.useFakeTimers();
    try {
      const p = { ...proposal, expiresAt: new Date(Date.now() + 1000).toISOString() };
      render(<ApprovalCard proposal={p} submission="idle" onDecision={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Approve action' })).toBeEnabled();
      act(() => vi.advanceTimersByTime(1001));
      expect(screen.getByRole('button', { name: 'Approve action' })).toBeDisabled();
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
    expect(screen.getByRole('button', { name: 'Approve action' })).toBeDisabled();
    rerender(<ApprovalCard proposal={proposal} submission="idle" expired onDecision={decide} />);
    expect(screen.getByRole('button', { name: 'Approve action' })).toBeDisabled();
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
