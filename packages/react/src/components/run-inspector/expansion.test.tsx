import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RunInspector } from '@stackunseen/ui';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it('run inspection keeps absent usage and duration unknown', async () => {
    render(
      <RunInspector
        runId="r"
        spans={[{ id: 's', name: 'Search', kind: 'tool', state: 'running' }]}
      />,
    );
    expect(screen.getByText('Usage not reported')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /Search.*Running/ }));
    expect(screen.getByText('Duration: Not measured')).toBeVisible();
  });
});
