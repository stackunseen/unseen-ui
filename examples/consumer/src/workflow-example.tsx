'use client';
import { useState } from 'react';
import { Button, WorkflowGraph } from '@ai-interaction/react';
import type { GraphNode, GraphEdge, GraphSelection } from '@ai-interaction/react';

const nodes: GraphNode[] = [
  {
    id: 'research',
    label: 'Research',
    state: 'succeeded',
    x: 20,
    y: 50,
    description: 'Synthetic public research summary.',
    runId: 'demo-1',
    durationMs: 1300,
  },
  { id: 'review', label: 'Review', state: 'queued', x: 80, y: 50 },
];
const edges: GraphEdge[] = [
  { id: 'a', from: 'research', to: 'review', label: 'Review findings', kind: 'dependency' },
  { id: 'b', from: 'review', to: 'research', label: 'Request changes', kind: 'loop' },
];
export function WorkflowExample() {
  const [selection, setSelection] = useState<GraphSelection>(),
    [denied, setDenied] = useState(false);
  return (
    <section aria-label="Controlled workflow example">
      <WorkflowGraph
        nodes={nodes}
        edges={edges}
        title="Packed workflow inspection"
        source="Synthetic host"
        version="v1"
        state={denied ? 'denied' : 'ready'}
        selection={selection}
        onSelect={(node) => setSelection({ kind: 'node', id: node.id })}
        onEdgeSelect={(edge) => setSelection({ kind: 'edge', id: edge.id })}
      />
      <Button variant="outline" onClick={() => setDenied((value) => !value)}>
        {denied ? 'Restore example workflow' : 'Revoke example workflow'}
      </Button>
    </section>
  );
}
