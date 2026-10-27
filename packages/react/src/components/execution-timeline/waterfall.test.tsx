import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExecutionTimeline } from './execution-timeline.js';

const entries = [
  {
    id: 'p',
    label: 'Plan',
    state: 'succeeded',
    timestamp: '2026-09-29T12:00:00Z',
    durationMs: 1_000,
    cost: '$0.03',
    tokens: '2k tokens',
  },
  {
    id: 'c',
    parentId: 'p',
    label: 'Read',
    state: 'succeeded',
    timestamp: '2026-09-29T12:00:00.200Z',
    durationMs: 500,
  },
  {
    id: 's',
    label: 'Search',
    state: 'failed',
    timestamp: '2026-09-29T12:00:01Z',
    durationMs: 3_000,
  },
  { id: 'w', label: 'Wait', state: 'waiting-approval', timestamp: '2026-09-29T12:00:04Z' },
];

describe('ExecutionTimeline waterfall', () => {
  it('places bars on one axis, folds children and marks the slowest step', () => {
    const { container } = render(<ExecutionTimeline variant="waterfall" entries={entries} />);
    const bars = container.querySelectorAll('[data-slowest]');
    expect(bars).toHaveLength(1);
    const plan = container.querySelector('details');
    expect(plan).toHaveAttribute('open');
    expect(within(plan as HTMLElement).getByText('Read')).toBeInTheDocument();
    expect(screen.getByText('Slowest')).toBeVisible();
    expect(screen.getByText('$0.03')).toBeVisible();
    expect(container.querySelector('[data-unmeasured]')).not.toBeNull();
    const search = container.querySelector('[data-state="failed"] [class*="wfBar"]') as HTMLElement;
    expect(search.style.insetInlineStart).toBe('25%');
    expect(search.style.inlineSize).toBe('75%');
  });
  it('shows the empty message with no entries', () => {
    render(<ExecutionTimeline variant="waterfall" entries={[]} />);
    expect(screen.getByText('No matching events.')).toBeVisible();
  });
});
