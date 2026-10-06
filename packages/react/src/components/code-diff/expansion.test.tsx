import { render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';
import { CodeDiff } from '@stackunseen/ui';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it.each(['unified', 'split', 'compact'] as const)(
    '%s diffs render inert text and hide inaccessible versions',
    (variant) => {
      const { container, rerender } = render(
        <CodeDiff
          variant={variant}
          path="test.ts"
          before="old"
          after={'<script>alert(1)</script>'}
          baseVersion="a"
          nextVersion="b"
        />,
      );
      expect(container.querySelector('script')).toBeNull();
      expect(screen.getByText(/1 added/)).toBeVisible();
      rerender(
        <CodeDiff
          variant={variant}
          path="test.ts"
          before="secret before"
          after="secret after"
          baseVersion="a"
          nextVersion="b"
          status="denied"
        />,
      );
      expect(screen.queryByText(/secret/)).toBeNull();
      expect(screen.getByRole('status')).toHaveTextContent('unavailable');
    },
  );
});
