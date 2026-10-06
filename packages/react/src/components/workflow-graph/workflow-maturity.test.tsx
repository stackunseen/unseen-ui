import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { WorkflowGraph } from '@stackunseen/ui';
import type { GraphNode, GraphEdge, GraphSelection, WorkflowGraphProps } from '@stackunseen/ui';
import { inspectWorkflow, workflowOutline } from './workflow-model.js';
import { routeWorkflow } from './workflow-routing.js';

const nodes: GraphNode[] = [
  {
    id: 'plan',
    label: 'Plan',
    state: 'succeeded',
    x: 16,
    y: 50,
    description: 'Public planning summary',
    runId: 'run-42',
    durationMs: 1280,
  },
  { id: 'code', label: 'Implement', state: 'running', x: 50, y: 22 },
  { id: 'test', label: 'Test', state: 'queued', x: 50, y: 78 },
  { id: 'review', label: 'Review', state: 'queued', x: 84, y: 50 },
];
const edges: GraphEdge[] = [
  { id: 'a', from: 'plan', to: 'code', label: 'Code path', kind: 'branch' },
  { id: 'b', from: 'plan', to: 'test', label: 'Test path', kind: 'branch' },
  { id: 'c', from: 'code', to: 'review', kind: 'dependency' },
  { id: 'd', from: 'test', to: 'review', kind: 'dependency' },
];
const props = { nodes, edges, onSelect: vi.fn(), source: 'Synthetic host', version: 'v1' };
async function openConnections() {
  await userEvent.setup().click(screen.getByRole('button', { name: 'Connections' }));
  return screen.getByRole('list', { name: 'Workflow connections' });
}

describe('controlled workflow inspection and distinct projections', () => {
  it.each(['graph', 'list', 'compact'] as const)(
    '%s preserves every node/relationship with a distinct projection',
    async (variant) => {
      const { container } = render(
        <WorkflowGraph {...props} variant={variant} onEdgeSelect={() => {}} />,
      );
      if (variant === 'graph') {
        expect(screen.getByRole('group', { name: 'Workflow diagram' })).toHaveAttribute(
          'tabindex',
          '0',
        );
        expect(container.querySelectorAll('[data-edge-id]')).toHaveLength(4);
      }
      if (variant === 'list') {
        expect(screen.getByRole('list', { name: 'Workflow node list' }).tagName).toBe('UL');
        expect(screen.getByRole('heading', { name: 'Plan Complete', level: 3 })).toBeVisible();
        expect(screen.getAllByRole('button', { name: '1 incoming connections' })).toHaveLength(2);
      }
      if (variant === 'compact') {
        expect(screen.getByRole('list', { name: 'Workflow traversal outline' }).tagName).toBe('OL');
        expect(container.querySelector('[data-reference="shared"]')).not.toBeNull();
        expect(screen.getByText(/This is not execution order/)).toBeVisible();
      }
      const connections = await openConnections();
      expect(within(connections).getAllByRole('listitem')).toHaveLength(4);
      expect(within(connections).getByText('Plan → Implement')).toBeVisible();
      expect(screen.queryByRole('region')).toBeNull();
    },
  );
  it.each(['graph', 'list', 'compact'] as const)(
    '%s emits node intent and waits for controlled selection',
    async (variant) => {
      const select = vi.fn();
      const { rerender } = render(<WorkflowGraph {...props} variant={variant} onSelect={select} />);
      const button = screen.getAllByRole('button', { name: 'Plan · succeeded' })[0]!;
      await userEvent.setup().click(button);
      expect(select).toHaveBeenCalledWith(nodes[0]);
      expect(button).toHaveAttribute('aria-pressed', 'false');
      expect(screen.queryByRole('group', { name: 'Selected node details' })).toBeNull();
      rerender(<WorkflowGraph {...props} variant={variant} onSelect={select} selectedId="plan" />);
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(button).toHaveFocus();
      const inspector = screen.getByRole('group', { name: 'Selected node details' });
      expect(within(inspector).getByRole('heading', { name: 'Plan', level: 3 })).toBeVisible();
      expect(inspector).toHaveTextContent('Public planning summary');
      expect(inspector).toHaveTextContent('run-42');
      expect(inspector).toHaveTextContent('1280 ms (host measured)');
    },
  );
  it('emits connection intent without selecting or claiming execution', async () => {
    const select = vi.fn();
    const { container, rerender } = render(<WorkflowGraph {...props} onEdgeSelect={select} />);
    const connections = await openConnections();
    const button = within(connections).getByRole('button', {
      name: 'Inspect connection E1: Code path',
    });
    await userEvent.setup().click(button);
    expect(select).toHaveBeenCalledWith(edges[0]);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    rerender(
      <WorkflowGraph {...props} onEdgeSelect={select} selection={{ kind: 'edge', id: 'a' }} />,
    );
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveFocus();
    expect(container.querySelector('[data-edge-id="a"]')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByRole('group', { name: 'Selected connection details' })).toHaveTextContent(
      'does not authorize or prove execution',
    );
  });
  it('supports a host-acknowledged selection union', async () => {
    function Host() {
      const [selection, setSelection] = useState<GraphSelection>();
      return (
        <WorkflowGraph
          {...props}
          selection={selection}
          onSelect={(node) => setSelection({ kind: 'node', id: node.id })}
          onEdgeSelect={(edge) => setSelection({ kind: 'edge', id: edge.id })}
        />
      );
    }
    render(<Host />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Plan · succeeded' }));
    expect(screen.getByRole('group', { name: 'Selected node details' })).toBeVisible();
    await openConnections();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Inspect connection E1: Code path' }));
    expect(screen.queryByRole('group', { name: 'Selected node details' })).toBeNull();
    expect(screen.getByRole('group', { name: 'Selected connection details' })).toBeVisible();
  });
  it('moves spatial focus without emitting selection; Enter invokes the host', async () => {
    const select = vi.fn();
    render(<WorkflowGraph {...props} onSelect={select} />);
    const first = screen.getByRole('button', { name: 'Plan · succeeded' });
    first.focus();
    const user = userEvent.setup();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'Implement · running' })).toHaveFocus();
    expect(select).not.toHaveBeenCalled();
    await user.keyboard('{End}');
    expect(screen.getByRole('button', { name: 'Review · queued' })).toHaveFocus();
    await user.keyboard('{Home}{Enter}');
    expect(select).toHaveBeenCalledWith(nodes[0]);
    expect(first).toHaveAttribute('aria-pressed', 'false');
  });
  it('restores focus within the workflow when a focused node disappears', () => {
    const { rerender } = render(<WorkflowGraph {...props} selectedId="plan" />);
    screen.getByRole('button', { name: 'Plan · succeeded' }).focus();
    rerender(
      <WorkflowGraph
        {...props}
        nodes={nodes.slice(1)}
        edges={edges.slice(2)}
        selectedId="plan"
        version="v2"
      />,
    );
    expect(screen.getByRole('group', { name: 'Agent workflow' })).toHaveFocus();
    expect(screen.queryByRole('group', { name: 'Selected node details' })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('unavailable');
    expect(screen.queryByText('Public planning summary')).toBeNull();
  });
  it('does not render obsolete selected edge details after immutable replacement', () => {
    const { rerender } = render(<WorkflowGraph {...props} selection={{ kind: 'edge', id: 'a' }} />);
    expect(screen.getByRole('group', { name: 'Selected connection details' })).toHaveTextContent(
      'Code path',
    );
    rerender(
      <WorkflowGraph
        {...props}
        edges={edges.slice(1)}
        selection={{ kind: 'edge', id: 'a' }}
        version="v2"
      />,
    );
    expect(screen.queryByRole('group', { name: 'Selected connection details' })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('unavailable');
  });
  it('rejects ambiguous selectedId/selection authority and preserves current data', () => {
    render(<WorkflowGraph {...props} selectedId="plan" selection={{ kind: 'edge', id: 'a' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('ambiguous');
    expect(screen.queryByRole('group', { name: 'Selected node details' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Selected connection details' })).toBeNull();
    expect(screen.getByRole('group', { name: 'Workflow diagram' })).toBeVisible();
  });
  it('preserves unknown duration and unfamiliar reported status without success inference', () => {
    render(
      <WorkflowGraph
        nodes={[{ ...nodes[1]!, state: 'custom-status' }]}
        edges={[]}
        selectedId="code"
      />,
    );
    const inspector = screen.getByRole('group', { name: 'Selected node details' });
    expect(inspector).toHaveTextContent('Unknown');
    expect(inspector).toHaveTextContent('Reported state: custom-status');
    expect(inspector).toHaveTextContent('Duration: Unknown');
    expect(screen.getByText(/no host handler/)).toBeVisible();
  });
  it.each(['stale', 'streaming'] as const)(
    '%s shows an explicit historical/provisional snapshot and pauses inspection',
    (state) => {
      render(<WorkflowGraph {...props} state={state} onEdgeSelect={() => {}} />);
      expect(screen.getByRole('status')).toHaveTextContent(
        state === 'stale' ? 'Historical' : 'Provisional',
      );
      expect(screen.getByRole('button', { name: 'Plan · succeeded' })).toBeDisabled();
    },
  );
  it.each(['loading', 'denied', 'unavailable', 'error', 'unknown'] as const)(
    '%s hides samples before reading getters',
    (state) => {
      const label = vi.fn(() => 'Secret');
      const node = {
        ...nodes[0]!,
        get label() {
          return label();
        },
      };
      render(<WorkflowGraph {...props} nodes={[node]} state={state} />);
      expect(label).not.toHaveBeenCalled();
      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.queryByText('Public planning summary')).toBeNull();
      expect(screen.queryByText('Synthetic host')).toBeNull();
    },
  );
  it.each([
    'node-bound',
    'edge-bound',
    'duplicate',
    'missing-target',
    'coordinate',
    'waypoint',
    'label',
    'accessor',
    'id',
    'duration',
  ] as const)('rejects invalid %s before rendering a partial projection', (scenario) => {
    const p: WorkflowGraphProps = { ...props };
    const read = vi.fn(() => 'Secret');
    if (scenario === 'node-bound')
      p.nodes = Array.from({ length: 51 }, (_, i) => ({
        ...nodes[0]!,
        id: String(i),
        get label() {
          return read();
        },
      }));
    if (scenario === 'edge-bound')
      p.edges = Array.from({ length: 101 }, (_, i) => ({
        ...edges[0]!,
        id: String(i),
        get label() {
          return read();
        },
      }));
    if (scenario === 'duplicate') p.nodes = [nodes[0]!, nodes[0]!];
    if (scenario === 'missing-target') p.edges = [{ ...edges[0]!, to: 'missing' }];
    if (scenario === 'coordinate') p.nodes = [{ ...nodes[0]!, x: Infinity }];
    if (scenario === 'waypoint') p.edges = [{ ...edges[0]!, waypoints: [{ x: 200, y: 50 }] }];
    if (scenario === 'label') p.nodes = [{ ...nodes[0]!, label: 'a'.repeat(201) }];
    if (scenario === 'accessor')
      p.nodes = [
        {
          ...nodes[0]!,
          get label() {
            return read();
          },
        },
      ];
    if (scenario === 'id') p.nodes = [{ ...nodes[0]!, id: '__proto__' }];
    if (scenario === 'duration') p.nodes = [{ ...nodes[0]!, durationMs: -1 }];
    render(<WorkflowGraph {...p} />);
    expect(screen.getByRole('alert')).toHaveTextContent('invalid');
    expect(screen.queryByRole('button')).toBeNull();
    expect(read).not.toHaveBeenCalled();
  });
  it('keeps untrusted labels/description/provenance inert in inspector and projections', () => {
    const text = '<img src=x onerror=alert(1)>';
    const { container } = render(
      <WorkflowGraph
        nodes={[{ ...nodes[0]!, label: text, description: text }]}
        edges={[]}
        selectedId="plan"
        source={text}
      />,
    );
    expect(container.querySelector('img,script')).toBeNull();
    expect(screen.getByRole('group', { name: 'Selected node details' })).toHaveTextContent(text);
  });
  it('uses distinct marker IDs across server-rendered workflow instances', () => {
    const markup = renderToStaticMarkup(
      <>
        <WorkflowGraph {...props} />
        <WorkflowGraph {...props} />
      </>,
    );
    const ids = [...markup.matchAll(/<marker id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('bounded routing and traversal semantics', () => {
  it('renders a nonzero self-loop and separates reciprocal/parallel routes', () => {
    const e: GraphEdge[] = [
      { id: 'self', from: 'plan', to: 'plan', kind: 'loop' },
      { id: 'forward', from: 'plan', to: 'review' },
      { id: 'other', from: 'plan', to: 'review' },
      { id: 'back', from: 'review', to: 'plan' },
    ];
    const routed = routeWorkflow(inspectWorkflow([nodes[0]!, nodes[3]!], e)!);
    expect(routed.routes.every((route) => Boolean(route.path))).toBe(true);
    expect(new Set(routed.routes.map((route) => route.path)).size).toBe(4);
    expect(routed.routes[0]!.points!.length).toBeGreaterThan(3);
    expect(routed.routes[0]!.loop).toBe(true);
    expect(routed.routes[3]!.loop).toBe(true);
    expect(JSON.stringify(routed)).not.toMatch(/NaN|Infinity/);
  });
  it('routes around an intervening node rather than crossing its padded rectangle', () => {
    const data: GraphNode[] = [
      { id: 'a', label: 'A', state: 'queued', x: 16, y: 50 },
      { id: 'obstacle', label: 'Obstacle', state: 'queued', x: 50, y: 50 },
      { id: 'b', label: 'B', state: 'queued', x: 84, y: 50 },
    ];
    const routed = routeWorkflow(inspectWorkflow(data, [{ id: 'route', from: 'a', to: 'b' }])!);
    const points = routed.routes[0]!.points!;
    expect(points).toBeDefined();
    for (let i = 1; i < points.length; i++)
      for (let step = 0; step <= 100; step++) {
        const x = points[i - 1]!.x + ((points[i]!.x - points[i - 1]!.x) * step) / 100;
        const y = points[i - 1]!.y + ((points[i]!.y - points[i - 1]!.y) * step) / 100;
        expect(x > 394 && x < 566 && y > 248 && y < 352).toBe(false);
      }
  });
  it('honors safe host guidance and explicitly preserves an unroutable connection', async () => {
    const data = [nodes[0]!, { ...nodes[1]!, x: 50, y: 50 }, nodes[3]!];
    const safe: GraphEdge = {
      id: 'guided',
      from: 'plan',
      to: 'review',
      waypoints: [
        { x: 30, y: 16 },
        { x: 70, y: 16 },
      ],
    };
    expect(routeWorkflow(inspectWorkflow(data, [safe])!).routes[0]!.points).toEqual(
      expect.arrayContaining([
        { x: 288, y: 96 },
        { x: 672, y: 96 },
      ]),
    );
    const blocked = { ...safe, waypoints: [{ x: 50, y: 50 }] };
    render(
      <WorkflowGraph nodes={data} edges={[blocked]} onSelect={() => {}} onEdgeSelect={() => {}} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('cannot be routed');
    expect((await openConnections()).textContent).toContain('Plan → Review');
  });
  it('uses the equivalent list when node positions overlap instead of overlaying controls', () => {
    render(
      <WorkflowGraph
        nodes={[nodes[0]!, { ...nodes[1]!, x: nodes[0]!.x, y: nodes[0]!.y }]}
        edges={[]}
        onSelect={() => {}}
      />,
    );
    expect(screen.queryByRole('group', { name: 'Workflow diagram' })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('positions overlap');
    expect(screen.getByRole('list', { name: 'Workflow node list' })).toBeVisible();
  });
  it('bounds cyclic/shared/disconnected traversal without presenting execution order', () => {
    const data = [...nodes, { id: 'isolated', label: 'Isolated', state: 'queued', x: 50, y: 50 }];
    const model = inspectWorkflow(data, [...edges, { id: 'return', from: 'review', to: 'code' }])!;
    const outline = workflowOutline(model);
    expect(outline.filter((entry) => !entry.reference)).toHaveLength(5);
    expect(outline.filter((entry) => entry.reference === 'cycle')).toHaveLength(1);
    expect(outline.filter((entry) => entry.reference === 'shared')).toHaveLength(1);
    expect(outline.find((entry) => entry.nodeId === 'isolated')?.component).toBe(2);
  });
  it('covers a cyclic component without a zero-incoming entry', () => {
    const outline = workflowOutline(
      inspectWorkflow(
        [nodes[0]!, nodes[3]!],
        [
          { id: 'a', from: 'plan', to: 'review' },
          { id: 'b', from: 'review', to: 'plan' },
        ],
      )!,
    );
    expect(outline[0]!.cyclicEntry).toBe(true);
    expect(outline[2]!.reference).toBe('cycle');
  });
  it('preserves all 50 nodes/100 edges and grows the bounded canvas for the window', () => {
    const data = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      label: `Node ${i}`,
      state: 'queued',
      x: 14 + (i % 5) * 18,
      y: 14 + Math.floor(i / 5) * 8,
    }));
    const links = Array.from({ length: 100 }, (_, i) => ({
      id: `e${i}`,
      from: String(i % 50),
      to: String((i + 1) % 50),
    }));
    const model = inspectWorkflow(data, links)!;
    expect(model).toBeDefined();
    const routed = routeWorkflow(model);
    expect(routed.overlaps).toBe(false);
    expect(routed.routes).toHaveLength(100);
    expect(routed.canvas.height).toBe(1200);
    expect(workflowOutline(model).length).toBeLessThanOrEqual(150);
  });
});
