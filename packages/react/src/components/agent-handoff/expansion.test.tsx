import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AgentHandoff } from '@ai-interaction/react';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it('handoff acceptance emits a versioned request without changing ownership', async () => {
    const decision = vi.fn(),
      value = {
        id: 'h',
        version: '3',
        from: 'A',
        to: 'B',
        owner: 'A',
        context: 'Review',
        scope: 'workspace',
        state: 'requested' as const,
      };
    render(<AgentHandoff value={value} onDecision={decision} />);
    await userEvent.click(screen.getByRole('button', { name: 'Accept handoff' }));
    expect(decision).toHaveBeenCalledWith(value, 'accept');
    expect(screen.getByText(/Current owner: A/)).toBeVisible();
  });
});
