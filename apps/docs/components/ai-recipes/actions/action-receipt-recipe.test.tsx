import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ActionReceiptRecipe } from './action-receipt-recipe';

async function review(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Allow access' }));
  expect(screen.queryByRole('button', { name: 'Approve action' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Confirm access decision' }));
  await waitFor(() => expect(screen.getByRole('group', { name: 'Action approval' })).toHaveFocus());
}

describe('ActionReceiptRecipe composition', () => {
  it('discloses simulation and follows keyboard review → submission → acceptance → execution → receipt', async () => {
    const user = userEvent.setup();
    render(<ActionReceiptRecipe />);
    expect(screen.getByText(/Simulated host · fixed local records/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start simulated execution' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Simulated host controls' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('button', { name: 'Change requested scope' })).toBeNull();
    await review(user);
    expect(screen.getByText('Access granted:')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Access decision details' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    const approve = screen.getByRole('button', { name: 'Approve action' });
    approve.focus();
    await user.keyboard('{Enter}');
    expect(approve).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Start simulated execution' })).toBeDisabled();
    expect(screen.getByText('No execution receipt received.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Accept decision' }));
    await waitFor(() =>
      expect(screen.getByRole('group', { name: 'Action approval' })).toHaveFocus(),
    );
    expect(screen.getByText('Action approved')).toBeVisible();
    expect(screen.queryByText('Review required')).toBeNull();
    expect(screen.getByText('Decision accepted. Execution has a separate result.')).toBeVisible();
    expect(screen.getByText('No execution receipt received.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Start simulated execution' }));
    await user.click(screen.getByRole('button', { name: 'Complete execution' }));
    await waitFor(() =>
      expect(screen.getByRole('group', { name: 'Command receipts' })).toHaveFocus(),
    );
    expect(screen.getByText('AC-104: applied')).toBeVisible();
    expect(screen.getByText('AC-108: applied')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start simulated execution' })).toBeDisabled();
    expect(
      screen.getByText('Host result received. Both simulated effects are confirmed.'),
    ).toHaveAttribute('aria-live', 'polite');
  });

  it('announces stale scope and keeps a submitted original available for receipt reconciliation', async () => {
    const user = userEvent.setup();
    render(<ActionReceiptRecipe />);
    await review(user);
    await user.click(screen.getByRole('button', { name: 'Approve action' }));
    await user.click(screen.getByRole('button', { name: 'Simulated host controls' }));
    await user.click(screen.getByRole('button', { name: 'Change requested scope' }));
    await user.click(screen.getByRole('button', { name: 'Accept decision' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Action scope, version, access or expiry no longer matches.',
    );
    expect(screen.getByRole('button', { name: 'Start simulated execution' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Inspect exact original binding' }));
    expect(screen.getByText('accounts:archive / access-3')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Review current action' }));
    await waitFor(() => expect(screen.getByRole('group', { name: 'Action review' })).toHaveFocus());
    expect(screen.getByText('Requested access: accounts:archive, accounts:export')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Allow access' })).toBeEnabled();
  });

  it('recovers both lost acknowledgements by lookup and preserves one execution', async () => {
    const user = userEvent.setup();
    render(<ActionReceiptRecipe />);
    await review(user);
    await user.click(screen.getByRole('button', { name: 'Approve action' }));
    await user.click(screen.getByRole('button', { name: 'Simulated host controls' }));
    await user.click(screen.getByRole('button', { name: 'Lose decision acknowledgement' }));
    expect(screen.getByText('Review required')).toBeVisible();
    expect(screen.queryByText('Action approved')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Simulate receipt not found' }));
    expect(screen.getByRole('button', { name: 'Start simulated execution' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Approve action' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check decision status' }));
    await user.click(screen.getByRole('button', { name: 'Start simulated execution' }));
    await user.click(screen.getByRole('button', { name: 'Lose result acknowledgement' }));
    expect(
      screen.getByText('Execution outcome unknown. Look up the original receipt.'),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Simulated host controls' }));
    expect(screen.getByRole('button', { name: 'Simulated host controls' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await user.click(screen.getByRole('button', { name: 'Look up original execution receipt' }));
    await waitFor(() =>
      expect(screen.getByRole('group', { name: 'Command receipts' })).toHaveFocus(),
    );
    expect(screen.getByText('AC-108: applied')).toBeVisible();
    expect(screen.getByText(/Simulated executions:/)).toHaveTextContent('Simulated executions: 1');
    expect(screen.getByRole('button', { name: 'Start simulated execution' })).toBeDisabled();
  });

  it('keeps partial failure effects and announces the result without claiming complete success', async () => {
    const user = userEvent.setup();
    render(<ActionReceiptRecipe />);
    await review(user);
    await user.click(screen.getByRole('button', { name: 'Approve action' }));
    await user.click(screen.getByRole('button', { name: 'Accept decision' }));
    await user.click(screen.getByRole('button', { name: 'Start simulated execution' }));
    await user.click(screen.getByRole('button', { name: 'Simulated host controls' }));
    await user.click(screen.getByRole('button', { name: 'Report partial failure' }));
    expect(screen.getByText('AC-104: applied')).toBeVisible();
    expect(screen.getByText('AC-108: failed')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('Partial failure');
    expect(
      screen.getByText('Partial failure recorded. One effect applied; one account is unchanged.'),
    ).toHaveAttribute('aria-live', 'polite');
  });
});
