import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RunBoard } from './run-board.js';

describe('RunBoard live steps', () => {
  it('shows the newest three steps, the model and the host clock on a board card', () => {
    render(
      <RunBoard
        now="2026-10-15T10:10:00.000Z"
        runs={[
          {
            run: { id: 'r1', attemptId: 'a1', threadId: 't1', version: 1, lifecycle: 'running' },
            title: 'Migrate users',
            model: 'Opus 5.5',
            startedAt: '2026-10-15T10:05:00.000Z',
            heartbeatAt: '2026-10-15T10:09:50.000Z',
            steps: [
              { label: 'One', at: '2026-10-15T10:06:00.000Z' },
              { label: 'Two', at: '2026-10-15T10:07:00.000Z' },
              { label: 'Three', at: '2026-10-15T10:08:00.000Z' },
              { label: 'Four', at: '2026-10-15T10:09:00.000Z' },
            ],
          },
        ]}
      />,
    );
    const steps = screen.getByRole('list', { name: 'Latest steps' });
    const items = within(steps).getAllByRole('listitem');
    expect(items.map((item) => item.textContent?.startsWith('One'))).not.toContain(true);
    expect(items).toHaveLength(3);
    expect(items[2]).toHaveTextContent('Four');
    expect(screen.getByText('Opus 5.5')).toBeVisible();
    // The board was given the host clock, so the figure is the host's and does not tick.
    expect(document.querySelector('time[data-running]')).toBeNull();
    expect(screen.getByText('5m 00s')).toBeVisible();
  });
});
