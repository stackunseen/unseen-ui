import { render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';
import { WorkflowGraph } from '@ai-interaction/react';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it('rejects unresolved workflow edges', () => {
    render(
      <WorkflowGraph
        nodes={[{ id: 'a', label: 'A', state: 'queued', x: 50, y: 50 }]}
        edges={[{ id: 'e', from: 'a', to: 'missing' }]}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('invalid');
  });
});
