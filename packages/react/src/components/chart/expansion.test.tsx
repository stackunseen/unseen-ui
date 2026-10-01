import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Chart } from '@ai-interaction/react';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it('charts provide equivalent values and reject non-finite data', async () => {
    const { rerender } = render(
      <Chart title="Duration" source="Runner" unit="seconds" points={[{ label: 'A', value: 2 }]} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Chart data' }));
    expect(within(screen.getByRole('table')).getByText('2')).toBeVisible();
    rerender(
      <Chart
        title="Duration"
        source="Runner"
        unit="seconds"
        points={[{ label: 'A', value: NaN }]}
      />,
    );
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('finite');
  });
});
