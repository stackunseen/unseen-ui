import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { AITheme } from '@stackunseen/ui';
import { RecoveryRecipe } from './recovery-recipe';

function setup() {
  const user = userEvent.setup();
  render(
    <AITheme appearance="light">
      <RecoveryRecipe />
    </AITheme>,
  );
  return user;
}
async function controls(user: ReturnType<typeof setup>) {
  await user.click(screen.getByRole('button', { name: 'Simulated host controls' }));
}

describe('recoverable chat recipe accessibility and behavior', () => {
  it('passes scoped axe structure checks with host settings open', async () => {
    const user = setup();
    await controls(user);
    const result = await axe.run(screen.getByRole('region', { name: 'Recoverable chat recipe' }), {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(
      result.violations.map((item) => ({
        id: item.id,
        targets: item.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
  });

  it('discloses simulation, uses named controls, and lets keyboard users access host settings', async () => {
    const user = setup();
    expect(screen.getByText(/No provider, network or durable backend/)).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeEnabled();
    expect(screen.getByRole('region', { name: 'Conversation history' })).toHaveAttribute(
      'tabindex',
      '0',
    );
    const trigger = screen.getByRole('button', { name: 'Simulated host controls' });
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('combobox', { name: 'Next request acknowledgement' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });

  it('disconnect and failed refresh preserve editable drafts, partial output and reading position', async () => {
    const user = setup();
    await controls(user);
    const viewport = screen.getByRole('region', { name: 'Conversation history' });
    viewport.scrollTop = 120;
    const draft = screen.getByRole('textbox', { name: 'Message' });
    await user.clear(draft);
    await user.type(draft, 'Unsent keyboard draft');
    await user.click(screen.getByRole('button', { name: 'Deliver next output' }));
    expect(viewport.scrollTop).toBe(120);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Disconnect transport' }));
    expect(draft).toHaveValue('Unsent keyboard draft');
    expect(screen.getByText(/Compare error counts with the baseline/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Refresh snapshot' }));
    await user.click(screen.getByRole('button', { name: 'Fail snapshot refresh' }));
    expect(screen.getByRole('alert')).toHaveTextContent('snapshot refresh failed');
    await user.click(screen.getByRole('button', { name: 'Refresh snapshot' }));
    await user.click(screen.getByRole('button', { name: 'Deliver refreshed snapshot' }));
    expect(viewport.scrollTop).toBe(120);
    expect(draft).toHaveValue('Unsent keyboard draft');
    const jump = screen.getByRole('button', { name: 'Jump to latest' });
    jump.focus();
    await user.keyboard('{Enter}');
    expect(viewport).toHaveFocus();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
      behavior: 'instant',
    });
  });

  it('unknown stop needs exact original lookup after reconnect; received does not claim stopped', async () => {
    const user = setup();
    await controls(user);
    await user.click(screen.getByRole('combobox', { name: 'Next request acknowledgement' }));
    await user.click(screen.getByRole('option', { name: 'Lose acknowledgement' }));
    await user.click(screen.getByRole('button', { name: 'Stop response' }));
    await user.click(screen.getByRole('button', { name: 'Deliver request result' }));
    expect(screen.getByText('Outcome unknown')).toBeVisible();
    expect(
      screen.getByText(/Acknowledgement lost\. Check the exact original receipt/, {
        selector: '[aria-live="polite"]',
      }),
    ).toHaveAttribute('aria-atomic', 'true');
    expect(screen.getByRole('button', { name: 'Stop response' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Disconnect transport' }));
    expect(screen.getByRole('button', { name: 'Look up original receipt' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Refresh snapshot' }));
    await user.click(screen.getByRole('button', { name: 'Deliver refreshed snapshot' }));
    await user.click(screen.getByRole('button', { name: 'Look up original receipt' }));
    await waitFor(() =>
      expect(screen.getByRole('group', { name: 'Original request' })).toHaveFocus(),
    );
    expect(screen.getByText('Received by host')).toBeVisible();
    expect(screen.queryByText('Stopped by host')).not.toBeInTheDocument();
    expect(screen.getByText(/Requests dispatched: 1 · original receipt lookups: 1/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Apply received request' }));
    expect(screen.getByText('Stopped by host')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Continue in new attempt' })).toBeEnabled();
  });

  it('coarse status changes announce; output tokens remain outside live regions and focus stays on controls', async () => {
    vi.mocked(Element.prototype.scrollIntoView).mockClear();
    const user = setup();
    await controls(user);
    const deliver = screen.getByRole('button', { name: 'Deliver next output' });
    deliver.focus();
    fireEvent.click(deliver);
    expect(deliver).toHaveFocus();
    const viewport = screen.getByRole('region', { name: 'Conversation history' });
    expect(
      within(viewport)
        .getByText(/Compare error counts/)
        .closest('[aria-live]'),
    ).toBeNull();
    expect(screen.getByText(/Seeded partial response/)).toHaveAttribute('aria-live', 'polite');
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Fail response' }));
    expect(within(viewport).getByRole('alert')).toHaveTextContent('Received content retained');
    expect(screen.getByRole('button', { name: 'Retry as new attempt' })).toBeEnabled();
  });
});
