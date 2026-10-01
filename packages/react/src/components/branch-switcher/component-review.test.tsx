import { render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';
import { BranchSwitcher } from '@ai-interaction/react';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('SME component review regressions', () => {
  it.each(['segmented', 'select', 'cards'] as const)(
    '%s branches reject an excessive host window consistently',
    async (variant) => {
      render(
        <BranchSwitcher
          variant={variant}
          branches={Array.from({ length: 51 }, (_, index) => ({
            id: `${index}`,
            label: `Branch ${index}`,
            version: '1',
          }))}
          value="50"
          onValueChange={() => {}}
        />,
      );
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid or excessive conversation data');
      expect(screen.queryByRole('combobox')).toBeNull();
      expect(screen.queryByText('Branch 0')).toBeNull();
      expect(screen.queryByText('Branch 50')).toBeNull();
    },
  );
});
