import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DotBars } from './dot-bars.js';
import { DotRing } from './dot-ring.js';
import { HeatKeys } from './heat-keys.js';
import { WeekStrip } from './week-strip.js';

describe('dot figures', () => {
  it('DotRing puts every value in a table and marks only the filled dots', () => {
    const { container } = render(
      <DotRing
        label="Runs by hour"
        data={[
          { label: '00:00', value: 4 },
          { label: '01:00', value: 0 },
        ]}
        depth={4}
        value="32 s"
        caption="per run"
        unit="runs"
      />,
    );
    const table = screen.getByRole('table', { name: 'Runs by hour' });
    expect(within(table).getByRole('rowheader', { name: '00:00' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: '4' })).toBeInTheDocument();
    expect(container.querySelectorAll('circle[data-on]')).toHaveLength(4);
    expect(container.querySelectorAll('circle')).toHaveLength(8);
    expect(screen.getByRole('figure', { name: 'Runs by hour' })).toHaveTextContent('32 s per run');
  });
  it('DotBars highlights the range, colours the outlier and ignores bad numbers', () => {
    const { container } = render(
      <DotBars
        label="Runs"
        data={[
          { label: 'Oct 1', value: 8 },
          { label: 'Oct 2', value: Number.NaN },
          { label: 'Oct 3', value: -3 },
        ]}
        rows={4}
        range={{ start: 0, end: 1 }}
        rangeLabel="Oct 1 – 2"
        outliers={[0]}
        axis={['Oct 1', 'Oct 3']}
      />,
    );
    const bars = container.querySelectorAll('[data-part="dot-bars"] span[data-in-range]');
    expect(bars).toHaveLength(2);
    expect(container.querySelectorAll('span[data-outlier]')).toHaveLength(1);
    expect(container.querySelectorAll('i[data-on]')).toHaveLength(4);
    expect(screen.getByText('Oct 1 – 2')).toBeVisible();
    expect(within(screen.getByRole('table')).getAllByRole('cell', { name: '0' })).toHaveLength(2);
  });
  it('WeekStrip stacks series per day, bolds the current day and totals the table', () => {
    const { container } = render(
      <WeekStrip
        label="This week"
        days={[
          { label: 'M', values: { a: 2, b: 1 } },
          { label: 'T', values: { a: 0, b: 3 } },
        ]}
        series={[
          { id: 'a', label: 'Summarize' },
          { id: 'b', label: 'Rewrite', swatch: 'red' },
        ]}
        current={1}
        unit="runs"
      />,
    );
    expect(container.querySelectorAll('[data-current]')).toHaveLength(1);
    const table = screen.getByRole('table', { name: 'This week' });
    expect(within(table).getByRole('columnheader', { name: 'Total (runs)' })).toBeInTheDocument();
    expect(within(table).getAllByRole('cell', { name: '3' })).toHaveLength(3);
    expect(screen.getByText('Rewrite', { selector: 'figcaption span span' })).toBeInTheDocument();
  });
  it('HeatKeys shades in four steps and keeps the label on every cell', () => {
    const { container } = render(
      <HeatKeys
        label="Keys"
        rows={[
          {
            keys: [
              { id: 'a', label: 'A', value: 10 },
              { id: 'b', label: 'B', value: 1 },
            ],
          },
          { offset: 1, keys: [{ id: 'space', label: 'space', value: 0, span: 4 }] },
        ]}
        scale={['Fewer', 'More']}
      />,
    );
    expect(container.querySelector('[data-level="4"]')).toHaveTextContent('A');
    expect(container.querySelector('[data-level="1"]')).toHaveTextContent('B');
    expect(container.querySelector('[data-wide]')).toHaveTextContent('space');
    expect(
      within(screen.getByRole('table')).getByRole('rowheader', { name: 'space' }),
    ).toBeInTheDocument();
  });
});
