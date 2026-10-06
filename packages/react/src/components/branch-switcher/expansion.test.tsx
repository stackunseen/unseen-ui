import { render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';
import { BranchSwitcher } from '@stackunseen/ui';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it('reports a missing branch without selecting a replacement', () => {
    const select = vi.fn();
    render(
      <BranchSwitcher
        branches={[{ id: 'a', label: 'A', version: '1' }]}
        value="missing"
        onValueChange={select}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('unavailable');
    expect(select).not.toHaveBeenCalled();
  });
});
