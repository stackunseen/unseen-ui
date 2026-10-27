import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AgentLanes } from './agent-lanes.js';

const lanes = [
  {
    agent: { id: 'a', name: 'Orchestrator' },
    tasks: [
      {
        id: 't1',
        title: 'Plan',
        state: 'succeeded',
        startedAt: '2026-10-15T10:00:00.000Z',
        endedAt: '2026-10-15T10:02:00.000Z',
        handoffTo: 't2',
      },
    ],
  },
  {
    agent: { id: 'b', name: 'Writer' },
    tasks: [
      { id: 't2', title: 'Write', state: 'running', startedAt: '2026-10-15T10:02:00.000Z' },
      { id: 't3', title: 'Lost', state: 'running', startedAt: 'not a date' },
    ],
  },
];

describe('AgentLanes', () => {
  it('draws a lane per agent, a hand-off line and a block reaching the host clock', async () => {
    const onSelect = vi.fn();
    const { container } = render(
      <AgentLanes lanes={lanes} now="2026-10-15T10:04:00.000Z" onSelect={onSelect} />,
    );
    expect(screen.getByRole('group', { name: 'Orchestrator' })).toBeInTheDocument();
    expect(container.querySelectorAll('svg[preserveAspectRatio] path')).toHaveLength(1);
    const write = screen.getByRole('button', { name: /Write, running/ });
    expect(write).toHaveAttribute('data-live', 'true');
    expect(write.style.left).toBe('50%');
    expect(write.style.width).toBe('50%');
    expect(
      screen.getByRole('button', { name: /Plan, succeeded.*hands off to Writer/ }),
    ).toBeVisible();
    await userEvent.click(write);
    expect(onSelect).toHaveBeenCalledWith('t2');
    const table = screen.getByRole('table', { name: 'Agent lanes' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
  });
  it('renders an empty board without lanes', () => {
    render(<AgentLanes lanes={[]} />);
    expect(screen.getByRole('heading', { name: 'Agent lanes' })).toBeVisible();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
