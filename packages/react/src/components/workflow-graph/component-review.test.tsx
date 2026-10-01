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

describe('SME component review regressions', () => {
  it('rejects oversized workflows before constructing their list alternative', () => {
    const label = vi.fn(() => 'Node');
    const nodes = Array.from({ length: 51 }, (_, index) => ({
      id: `${index}`,
      get label() {
        return label();
      },
      state: 'queued',
      x: 50,
      y: 50,
    }));
    render(<WorkflowGraph nodes={nodes} edges={[]} onSelect={() => {}} />);
    expect(label).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('preview limits are invalid');
  });

  it('rejects ambiguous workflow edge identities', () => {
    render(
      <WorkflowGraph
        nodes={[
          { id: 'a', label: 'A', state: 'queued', x: 25, y: 50 },
          { id: 'b', label: 'B', state: 'queued', x: 75, y: 50 },
        ]}
        edges={[
          { id: 'e', from: 'a', to: 'b' },
          { id: 'e', from: 'b', to: 'a' },
        ]}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('invalid');
  });
});
