import { render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';
import { Chart } from '@stackunseen/ui';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('SME component review regressions', () => {
  it('rejects oversized charts before reading their point values', () => {
    const value = vi.fn(() => 1);
    const points = Array.from({ length: 61 }, () => ({
      label: 'A',
      get value() {
        return value();
      },
    }));
    render(<Chart title="Chart" points={points} unit="units" source="Host" />);
    expect(value).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('no more than 60');
  });

  it('keeps SVG coordinates finite for extreme finite chart values', () => {
    const { container } = render(
      <Chart
        title="Chart"
        variant="line"
        points={[
          { label: 'Low', value: -Number.MAX_VALUE },
          { label: 'High', value: Number.MAX_VALUE },
        ]}
        unit="units"
        source="Host"
      />,
    );
    expect(container.querySelector('svg')?.innerHTML).not.toMatch(/NaN|Infinity/);
    expect(screen.getByRole('group', { name: 'Chart chart' })).toHaveAttribute('tabindex', '0');
  });
});
