import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BarList } from './bar-list.js';
import { DonutChart } from './donut-chart.js';
import { Sparkline } from './sparkline.js';
import { Tracker } from './tracker.js';

describe('data marks', () => {
  it('Sparkline breaks the line at a gap and lists every sample', () => {
    const { container } = render(
      <Sparkline
        label="Latency"
        unit="ms"
        data={[
          { label: 'Mon', value: 120 },
          { label: 'Tue', value: 140 },
          { label: 'Wed', value: null },
          { label: 'Thu', value: 110 },
          { label: 'Fri', value: 90 },
        ]}
      />,
    );
    expect(container.querySelectorAll('path')).toHaveLength(2);
    const table = screen.getByRole('table', { name: 'Latency' });
    expect(within(table).getByRole('columnheader', { name: 'ms' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: 'Not reported' })).toBeInTheDocument();
  });
  it('Sparkline bars skip gaps and the tone reaches the root', () => {
    const { container } = render(
      <Sparkline
        label="Calls"
        variant="bar"
        tone="negative"
        data={[
          { label: 'a', value: 3 },
          { label: 'b', value: Number.NaN },
          { label: 'c', value: 5 },
        ]}
      />,
    );
    expect(container.querySelectorAll('rect')).toHaveLength(2);
    expect(screen.getByRole('figure', { name: 'Calls' })).toHaveAttribute('data-tone', 'negative');
  });
  it('BarList prints each value and scales bars to the largest', () => {
    const { container } = render(
      <BarList
        label="Tokens by tool"
        items={[
          { id: 'search', label: 'search', value: 200, display: '200 k' },
          { id: 'read', label: 'read_file', value: 50 },
          { id: 'bad', label: 'broken', value: -4 },
        ]}
      />,
    );
    const list = screen.getByRole('list', { name: 'Tokens by tool' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(list).toHaveTextContent('200 k');
    expect(list).toHaveTextContent('read_file50');
    const fills = [...container.querySelectorAll<HTMLElement>('[data-fill]')];
    expect(fills.map((fill) => fill.style.inlineSize)).toEqual(['100%', '25%', '0%']);
  });
  it('Tracker names every status in words and treats unknown values as no data', () => {
    const { container } = render(
      <Tracker
        label="Nightly runs"
        summary="2 of 3 succeeded"
        segments={[
          { label: 'Oct 1', status: 'ok' },
          { label: 'Oct 2', status: 'failed', detail: 'Timeout in step 3' },
          { label: 'Oct 3', status: 'bogus' as never },
        ]}
      />,
    );
    const blocks = container.querySelectorAll('[data-status]');
    expect([...blocks].map((block) => block.getAttribute('data-status'))).toEqual([
      'ok',
      'failed',
      'unknown',
    ]);
    expect(blocks[1]).toHaveAttribute('title', 'Oct 2: Failed, Timeout in step 3');
    const table = screen.getByRole('table', { name: 'Nightly runs' });
    expect(within(table).getByRole('cell', { name: 'No data' })).toBeInTheDocument();
    expect(screen.getByRole('figure', { name: 'Nightly runs' })).toHaveTextContent(
      '2 of 3 succeeded',
    );
  });
  it('DonutChart prints shares that add up and skips empty slices', () => {
    const { container } = render(
      <DonutChart
        label="Spend by model"
        value="$100"
        caption="this month"
        data={[
          { id: 'a', label: 'Atlas', value: 75 },
          { id: 'b', label: 'Brisk', value: 25 },
          { id: 'c', label: 'Unused', value: 0 },
        ]}
      />,
    );
    // Track plus two drawn slices.
    expect(container.querySelectorAll('circle')).toHaveLength(3);
    const table = screen.getByRole('table', { name: 'Spend by model' });
    expect(within(table).getByRole('cell', { name: '75%' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: '25%' })).toBeInTheDocument();
    expect(screen.getByRole('figure', { name: 'Spend by model' })).toHaveTextContent(
      '$100this month',
    );
  });
});
