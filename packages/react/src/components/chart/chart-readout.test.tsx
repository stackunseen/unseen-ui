import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Chart } from './chart.js';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const points = [
  { label: 'Alpha', value: 1 },
  { label: 'Beta', value: 2 },
];

describe('Chart readout', () => {
  it('reads the hovered value, then clears it when the pointer leaves', () => {
    const { container } = render(
      <Chart title="Chart" points={points} unit="units" source="Host" />,
    );
    fireEvent.mouseEnter(container.querySelector('[data-point="0:1"]')!);
    const readout = screen.getByText('Beta: 2 units');
    expect(readout).toBeVisible();
    fireEvent.mouseLeave(readout.parentElement!);
    expect(screen.queryByText('Beta: 2 units')).toBeNull();
  });

  it('moves across categories and series with the arrow keys', async () => {
    const user = userEvent.setup();
    render(
      <Chart
        title="Chart"
        variant="line"
        unit="USD"
        source="Host"
        series={[
          {
            id: 'revenue',
            label: 'Revenue',
            points: [
              { label: 'Mon', value: 10 },
              { label: 'Tue', value: 12 },
            ],
          },
          {
            id: 'cost',
            label: 'Cost',
            points: [
              { label: 'Mon', value: 4 },
              { label: 'Tue', value: 5 },
            ],
          },
        ]}
      />,
    );
    const plot = screen.getByRole('group', { name: 'Chart chart' });
    plot.focus();
    const readout = () => document.querySelector('[data-part="chart-readout"]');
    await user.keyboard('{ArrowRight}');
    expect(readout()).toHaveTextContent('Revenue, Mon: 10 USD');
    await user.keyboard('{ArrowRight}');
    expect(readout()).toHaveTextContent('Revenue, Tue: 12 USD');
    await user.keyboard('{ArrowDown}');
    expect(readout()).toHaveTextContent('Cost, Tue: 5 USD');
  });
});
