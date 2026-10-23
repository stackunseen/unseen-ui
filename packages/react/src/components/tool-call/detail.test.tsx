import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  ExecutionTimeline,
  RunInspector,
  ToolCall,
  ToolGroup,
  WorkflowGraph,
} from '@stackunseen/ui';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const tool = {
  id: 't1',
  name: 'search_accounts',
  revision: 2,
  state: 'succeeded' as const,
  input: '{}',
  output: '3 found',
  durationMs: 820,
};

describe('detail level defaults to compact', () => {
  it('ToolCall hides the revision and host duration until detail is full', () => {
    const { rerender, container } = render(<ToolCall value={tool} />);
    expect(screen.getByRole('button', { name: 'Input' })).toBeVisible();
    expect(container.textContent).not.toContain('Took');
    expect(container.textContent).toContain('3 found');
    rerender(<ToolCall value={tool} detail="full" />);
    expect(screen.getByRole('button', { name: 'Input · revision 2' })).toBeVisible();
    expect(container.textContent).toContain('Took 820 ms');
  });

  it('ToolGroup passes the level to every call, in both layouts', async () => {
    const user = userEvent.setup();
    for (const variant of ['stack', 'accordion'] as const) {
      const compact = render(<ToolGroup tools={[tool, { ...tool, id: 't2' }]} variant={variant} />);
      if (variant === 'accordion')
        await user.click(compact.getAllByRole('button', { name: /search_accounts/ })[0]!);
      expect(compact.container.textContent).not.toContain('revision');
      expect(compact.container.textContent).toContain('Input');
      compact.unmount();
      const full = render(
        <ToolGroup tools={[tool, { ...tool, id: 't2' }]} variant={variant} detail="full" />,
      );
      if (variant === 'accordion')
        await user.click(full.getAllByRole('button', { name: /search_accounts/ })[0]!);
      expect(full.container.textContent).toContain('revision 2');
      full.unmount();
    }
  });

  it('RunInspector shows the summary only, then kind, parent and duration when full', () => {
    const spans = [
      {
        id: 's2',
        parentId: 's1',
        name: 'Run tests',
        kind: 'tool' as const,
        state: 'complete' as const,
        durationMs: 940,
        summary: 'Ran the suite.',
      },
    ];
    const { rerender, container } = render(
      <RunInspector runId="r" spans={spans} variant="cards" />,
    );
    expect(container.textContent).toContain('Ran the suite.');
    expect(container.textContent).not.toContain('Parent s1');
    expect(container.textContent).not.toContain('Duration:');
    rerender(<RunInspector runId="r" spans={spans} variant="cards" detail="full" />);
    expect(container.textContent).toContain('Tool · Parent s1');
    expect(container.textContent).toContain('Duration: 940ms');
  });

  it('WorkflowGraph drops the counts and source line and shortens the hint', () => {
    const props = {
      nodes: [
        { id: 'a', label: 'Plan', state: 'succeeded', x: 20, y: 50 },
        { id: 'b', label: 'Review', state: 'queued', x: 80, y: 50 },
      ],
      edges: [{ id: 'e', from: 'a', to: 'b' }],
      source: 'Synthetic host',
      version: 'v1',
      onSelect: () => {},
    };
    const { rerender, container } = render(<WorkflowGraph {...props} />);
    expect(container.textContent).not.toContain('2 nodes');
    expect(container.textContent).not.toContain('Source:');
    expect(container.textContent).toContain('Arrow keys move between nodes');
    rerender(<WorkflowGraph {...props} detail="full" />);
    expect(container.textContent).toContain(
      '2 nodes · 1 connections · Source: Synthetic host · Snapshot: v1',
    );
    expect(container.textContent).toContain('Focus the diagram to scroll');
  });

  it('ExecutionTimeline prints a measured duration only, and the unknown line when full', () => {
    const entries = [
      {
        id: '1',
        label: 'Searched',
        state: 'succeeded',
        timestamp: '2026-10-16T10:00:00Z',
        durationMs: 820,
      },
      { id: '2', label: 'Waiting', state: 'waiting-approval', timestamp: '2026-10-16T10:00:01Z' },
    ];
    for (const variant of ['timeline', 'table'] as const) {
      const { unmount, container } = render(
        <ExecutionTimeline entries={entries} variant={variant} />,
      );
      expect(container.textContent).toContain('820 ms');
      expect(container.textContent).not.toContain('Duration unknown');
      unmount();
      const full = render(<ExecutionTimeline entries={entries} variant={variant} detail="full" />);
      expect(full.container.textContent).toContain('Took 820 ms');
      expect(full.container.textContent).toContain('Duration unknown');
      full.unmount();
    }
  });
});
