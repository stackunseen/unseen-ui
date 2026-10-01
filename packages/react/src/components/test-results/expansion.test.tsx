import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TestResults } from '@ai-interaction/react';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it('test diagnostics are disclosed without converting failures to passes', async () => {
    render(
      <TestResults
        results={[{ id: '1', name: 'search', state: 'failed', detail: 'Expected a value' }]}
      />,
    );
    expect(screen.getByText('0 passed · 1 failed · 1 total')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Test details: search' }));
    expect(screen.getByText('Expected a value')).toBeVisible();
  });
});
