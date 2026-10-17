import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AgentSteps } from './agent-steps.js';

const steps = [
  { id: 'a', label: 'Collect', state: 'succeeded', dependencyIds: [] },
  { id: 'b', label: 'Rank', state: 'running', dependencyIds: ['a', 'gone'] },
] as const;

describe('AgentSteps dependencies and selection', () => {
  it('prints prerequisites, names a missing one and reports the chosen step', async () => {
    const select = vi.fn();
    render(
      <AgentSteps
        steps={steps.map((step) => ({ ...step, dependencyIds: [...step.dependencyIds] }))}
        dependencies
        selectedId="a"
        onSelect={select}
      />,
    );
    expect(screen.getByText('Starting step')).toBeInTheDocument();
    expect(screen.getByText('After: Collect, Unavailable step gone')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collect' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Rank' }));
    expect(select).toHaveBeenCalledWith('b');
  });

  it('leaves names as text and hides prerequisites by default', () => {
    render(
      <AgentSteps
        steps={steps.map((step) => ({ ...step, dependencyIds: [...step.dependencyIds] }))}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Collect' })).toBeNull();
    expect(screen.queryByText('Starting step')).toBeNull();
  });
});
