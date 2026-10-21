import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Step } from '@stackunseen/ui-core';
import { WorkSummary } from './work-summary.js';

afterEach(() => vi.useRealTimers());

const steps: Step[] = [
  { id: 'read', label: 'Read the repository', state: 'succeeded', dependencyIds: [] },
  { id: 'edit', label: 'Edit src/search.ts', state: 'running', dependencyIds: [] },
];

describe('WorkSummary', () => {
  it('is open and counting while running, then collapses to "Worked for"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T10:00:12Z'));
    const { rerender } = render(
      <WorkSummary steps={steps} state="running" startedAt="2026-10-21T10:00:00Z" />,
    );
    const trigger = screen.getByRole('button', { name: /Working · 12s/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('list', { name: 'Steps' })).toBeVisible();
    act(() => vi.advanceTimersByTime(3000));
    expect(trigger).toHaveTextContent('Working · 15s');
    rerender(
      <WorkSummary
        steps={steps.map((step) => ({ ...step, state: 'succeeded' }))}
        state="done"
        startedAt="2026-10-21T10:00:00Z"
        endedAt="2026-10-21T10:00:16Z"
      />,
    );
    expect(trigger).toHaveTextContent('Worked for 16s');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('stops the clock when the host only changes the state', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T10:00:05Z'));
    const { rerender } = render(
      <WorkSummary steps={steps} state="running" startedAt="2026-10-21T10:00:00Z" />,
    );
    rerender(<WorkSummary steps={steps} state="stopped" startedAt="2026-10-21T10:00:00Z" />);
    const trigger = screen.getByRole('button', { name: /Stopped after 5s/ });
    act(() => vi.advanceTimersByTime(10_000));
    rerender(<WorkSummary steps={steps} state="stopped" startedAt="2026-10-21T10:00:00Z" />);
    expect(trigger).toHaveTextContent('Stopped after 5s');
  });

  it('opens on demand after the run and shows extra content', async () => {
    const user = userEvent.setup();
    render(
      <WorkSummary steps={steps} state="failed" startedAt={0} durationMs={65_000}>
        <pre>exit code 1</pre>
      </WorkSummary>,
    );
    const trigger = screen.getByRole('button', { name: /Failed after 1m 05s/ });
    await user.click(trigger);
    expect(screen.getByText('exit code 1')).toBeVisible();
  });
});
