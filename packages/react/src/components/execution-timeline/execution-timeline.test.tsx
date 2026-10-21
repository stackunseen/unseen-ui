import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ExecutionTimeline, type TimelineEntry } from './execution-timeline.js';
import { componentVariants } from '../../shared/variants.js';

const events: TimelineEntry[] = [
  { id: 'done', label: 'Read source', state: 'succeeded', timestamp: '2026-10-01T07:00:00Z' },
  {
    id: 'failed',
    label: 'Fetch source',
    state: 'failed',
    timestamp: '2026-10-01T07:01:00Z',
    detail: 'Host reported a network failure.',
  },
  { id: 'queued', label: 'Retry pending', state: 'queued', timestamp: '2026-10-01T07:02:00Z' },
];

describe('ExecutionTimeline controlled presentation', () => {
  it.each(componentVariants.ExecutionTimeline)(
    '%s emits keyboard filter requests and waits for the host to accept them',
    async (variant) => {
      const user = userEvent.setup();
      const change = vi.fn();
      const props = { variant, entries: events, onFilterChange: change };
      const { rerender } = render(<ExecutionTimeline {...props} />);
      const filter = screen.getByRole('combobox', { name: 'Show events' });
      await user.tab();
      expect(filter).toHaveFocus();
      await user.keyboard('{Enter}{End}{Enter}');
      expect(change).toHaveBeenCalledExactlyOnceWith('failed');
      await waitFor(() => expect(filter).toHaveFocus());
      expect(filter).toHaveTextContent('All events');
      expect(screen.getByText('Read source')).toBeVisible();
      expect(screen.getByText('Retry pending')).toBeVisible();

      rerender(<ExecutionTimeline {...props} filter="failed" />);
      expect(filter).toHaveTextContent('Failures');
      expect(screen.queryByText('Read source')).not.toBeInTheDocument();
      expect(screen.queryByText('Retry pending')).not.toBeInTheDocument();
      expect(screen.getByText('Host reported a network failure.')).toBeVisible();
      expect(screen.getByText('Failed')).toBeVisible();
      await user.keyboard('{Enter}{Home}{Enter}');
      expect(change).toHaveBeenLastCalledWith('all');
      await waitFor(() => expect(filter).toHaveFocus());
      expect(filter).toHaveTextContent('Failures');
      expect(screen.queryByText('Read source')).not.toBeInTheDocument();

      rerender(<ExecutionTimeline {...props} filter="all" />);
      expect(screen.getByText('Read source')).toBeVisible();
      expect(screen.getByText('Fetch source')).toBeVisible();
      expect(screen.getByText('Retry pending')).toBeVisible();
    },
  );

  it.each(componentVariants.ExecutionTimeline)(
    '%s applies a read-only failure filter and explains empty results',
    (variant) => {
      const { rerender } = render(
        <ExecutionTimeline variant={variant} entries={events} filter="failed" />,
      );
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.getByText('Fetch source')).toBeVisible();
      expect(screen.queryByText('Read source')).not.toBeInTheDocument();
      rerender(<ExecutionTimeline variant={variant} entries={[events[0]!]} filter="failed" />);
      expect(screen.getByText('No matching events.')).toBeVisible();
      expect(screen.queryByText('Read source')).not.toBeInTheDocument();
      rerender(<ExecutionTimeline variant={variant} entries={[]} />);
      expect(screen.getByText('No matching events.')).toBeVisible();
    },
  );

  it.each(componentVariants.ExecutionTimeline)(
    '%s preserves host text, timestamps and ordering without interpreting generated markup',
    (variant) => {
      const timestamp = '2026-10-01T09:00:00+02:00';
      const { container } = render(
        <ExecutionTimeline
          variant={variant}
          entries={[
            {
              id: 'untrusted',
              label: '<script>event()</script>',
              detail: '<img src=x onerror=event()>',
              state: 'provider-unrecognized',
              timestamp,
            },
            events[0]!,
          ]}
        />,
      );
      expect(screen.getByText('<script>event()</script>')).toBeVisible();
      expect(screen.getByText('<img src=x onerror=event()>')).toBeVisible();
      expect(container.querySelector('script, img')).toBeNull();
      expect(screen.getByText('Unknown')).toBeVisible();
      const times = [...container.querySelectorAll('time')];
      expect(times.map((node) => node.getAttribute('datetime'))).toEqual([
        timestamp,
        events[0]!.timestamp,
      ]);
      // Shown in the viewer's zone (UTC in tests), in the machine's date order.
      for (const node of times) expect(node.textContent).toMatch(/2026.*7:00\s?(AM|am) UTC$/);
    },
  );

  it.each(componentVariants.ExecutionTimeline)(
    '%s presents missing or invalid durations as unknown, preserving measured zero and fractions',
    (variant) => {
      const durations = [undefined, -1, Number.NaN, Infinity, -Infinity, 0, 12.5];
      render(
        <ExecutionTimeline
          variant={variant}
          detail="full"
          entries={durations.map((durationMs, index) => ({
            id: String(index),
            label: `Event ${index}`,
            state: 'succeeded',
            timestamp: '2026-10-01T07:00:00Z',
            durationMs,
          }))}
        />,
      );
      expect(screen.getAllByText(/Host duration unknown/)).toHaveLength(5);
      expect(screen.getByText(/Host duration 0 ms/)).toBeVisible();
      expect(screen.getByText(/Host duration 12.5 ms/)).toBeVisible();
      expect(
        screen.queryByText(/Host duration (?:NaN|[+-]?Infinity|-1) ms/),
      ).not.toBeInTheDocument();
    },
  );

  it('provides a named keyboard focus target around the semantic table', async () => {
    const user = userEvent.setup();
    render(<ExecutionTimeline variant="table" entries={events} />);
    const scrollRegion = screen.getByRole('region', { name: 'Execution event table' });
    await user.tab();
    expect(scrollRegion).toHaveFocus();
    expect(scrollRegion).toHaveAttribute('tabindex', '0');
    const table = within(scrollRegion).getByRole('table', { name: 'Execution events' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((node) => node.textContent),
    ).toEqual(['Event', 'Time', 'Status']);
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    await user.keyboard('{ArrowDown}');
    expect(scrollRegion).toHaveFocus();
  });
});
