import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../button/button.js';
import {
  EmptyState,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateActions,
  EmptyStateIcon,
} from './empty-state.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('website feedback content', () => {
  it('composes an empty-state heading, readable reason and optional actions without a live region', async () => {
    const create = vi.fn();
    render(
      <EmptyState align="start" dir="rtl">
        <EmptyStateIcon>
          <span>Decorative files</span>
        </EmptyStateIcon>
        <EmptyStateTitle as="h2">No reports yet</EmptyStateTitle>
        <EmptyStateDescription>Run your first report to see results here.</EmptyStateDescription>
        <EmptyStateActions>
          <Button onClick={create}>Create report</Button>
        </EmptyStateActions>
      </EmptyState>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'No reports yet' })).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Decorative files').parentElement).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    await userEvent.tab();
    await userEvent.keyboard(' ');
    expect(create).toHaveBeenCalledTimes(1);
  });
});
