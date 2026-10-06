import { render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';
import { ReviewChanges } from '@stackunseen/ui';
import { before, after } from '../../../../../apps/docs/lib/coding-fixtures';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it.each(['stale', 'conflict'])('blocks %s change acceptance', (state) => {
    render(
      <ReviewChanges
        changes={[{ id: 'a', path: 'a.ts', before, after, conflict: state === 'conflict' }]}
        baseVersion="1"
        proposalVersion="2"
        selectedIds={['a']}
        onSelectionChange={() => {}}
        state={state === 'stale' ? 'stale' : 'ready'}
        onDecision={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Accept selected changes' })).toBeDisabled();
  });
});
