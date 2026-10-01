import { render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';
import { ReviewChanges } from '@ai-interaction/react';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('SME component review regressions', () => {
  it('blocks decisions when a proposal contains changes beyond the visible review limit', () => {
    const changes = Array.from({ length: 51 }, (_, index) => ({
      id: `${index}`,
      path: `${index}.ts`,
      before: 'before',
      after: 'after',
    }));
    render(
      <ReviewChanges
        changes={changes}
        baseVersion="1"
        proposalVersion="2"
        selectedIds={['50']}
        onSelectionChange={() => {}}
        state="ready"
        onDecision={() => {}}
      />,
    );
    expect(screen.getByText(/Only the first 50 changes/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Accept selected changes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject proposal' })).toBeDisabled();
  });
});
