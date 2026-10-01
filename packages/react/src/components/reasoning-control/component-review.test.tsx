import { render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';
import { ReasoningControl } from '@ai-interaction/react';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('SME component review regressions', () => {
  it('uses a valid select when a model exposes only one reasoning level', () => {
    render(
      <ReasoningControl
        options={[{ id: 'fixed', label: 'Fixed effort' }]}
        value="fixed"
        onValueChange={() => {}}
      />,
    );
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.getByRole('combobox')).toHaveTextContent('Fixed effort');
  });
});
