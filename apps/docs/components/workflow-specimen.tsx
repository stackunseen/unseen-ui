'use client';
import { useState } from 'react';
import { Button, WorkflowGraph, resolveVariant } from '@ai-interaction/react';
import type {
  GraphNode,
  GraphEdge,
  GraphSelection,
  WorkflowGraphProps,
} from '@ai-interaction/react';
import { nodes as fixtureNodes, edges as fixtureEdges } from '../lib/coding-fixtures';
import styles from './form-specimen.module.css';

export function WorkflowSpecimen({
  state,
  presentation,
  onEvent,
}: {
  state: string;
  presentation?: string;
  onEvent: (message: string) => void;
}) {
  const [version, setVersion] = useState(1),
    [revoked, setRevoked] = useState(false);
  const [selection, setSelection] = useState<GraphSelection | undefined>(
    state === 'Selected node'
      ? { kind: 'node', id: 'plan' }
      : state === 'Selected connection'
        ? { kind: 'edge', id: 'a' }
        : state === 'Obsolete selection'
          ? { kind: 'node', id: 'obsolete' }
          : undefined,
  );
  const [request, setRequest] = useState<{ selection: GraphSelection; version: number }>();
  const long = state === 'Long labels';
  let nodes: GraphNode[] = fixtureNodes.map((node) => ({
    ...node,
    state: node.state === 'complete' ? 'succeeded' : node.state,
    label: long
      ? `${node.label}: inspect the customer deployment review and verify the current workspace access scope`
      : node.label,
    description: `Synthetic public ${node.label.toLowerCase()} summary for snapshot ${version}.`,
    runId: `run-${version}`,
    durationMs: node.id === 'plan' ? 1280 : undefined,
  }));
  let edges: GraphEdge[] = fixtureEdges.map((edge, i) => ({
    ...edge,
    label: long
      ? `Connection ${i + 1}: continue the current deployment review when the host reports the declared condition`
      : ['Code path', 'Test path', 'Ready for review', 'Checks available'][i],
    kind: edge.from === 'plan' ? 'branch' : 'dependency',
  }));
  if (state === 'Self-loop') {
    nodes = [nodes[0]!];
    edges = [{ id: 'a', from: 'plan', to: 'plan', label: 'Recheck input', kind: 'loop' }];
  }
  if (state === 'Return loop')
    edges.push({
      id: 'return',
      from: 'review',
      to: 'plan',
      label: 'Changes requested',
      kind: 'loop',
      state: 'outcome-unknown',
    });
  if (['Parallel edges', 'Cyclic component'].includes(state)) {
    nodes = [nodes[0]!, nodes[3]!];
    edges =
      state === 'Parallel edges'
        ? ['Fast checks', 'Full checks', 'Policy checks'].map((label, i) => ({
            id: String(i),
            from: 'plan',
            to: 'review',
            label,
            kind: 'branch',
          }))
        : [
            { id: 'a', from: 'plan', to: 'review' },
            { id: 'b', from: 'review', to: 'plan', kind: 'loop' },
          ];
  }
  if (['Obstacle routing', 'Host route', 'Unroutable'].includes(state)) {
    nodes = [nodes[0]!, { ...nodes[1]!, x: 50, y: 50, label: 'Other task' }, nodes[3]!];
    edges = [
      {
        id: 'a',
        from: 'plan',
        to: 'review',
        label: 'Review route',
        waypoints:
          state === 'Host route'
            ? [
                { x: 30, y: 16 },
                { x: 70, y: 16 },
              ]
            : state === 'Unroutable'
              ? [{ x: 50, y: 50 }]
              : undefined,
      },
    ];
  }
  if (state === 'Disconnected')
    nodes.push({
      id: 'isolated',
      label: 'Independent task',
      state: 'queued',
      x: 50,
      y: 50,
      description: 'No connections supplied for this task.',
    });
  if (state === 'Overlapping nodes') nodes = nodes.map((node) => ({ ...node, x: 50, y: 50 }));
  if (state === 'Window limit') {
    nodes = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      label: `Node ${i + 1}`,
      state: 'queued',
      x: 14 + (i % 5) * 18,
      y: 14 + Math.floor(i / 5) * 8,
    }));
    edges = Array.from({ length: 100 }, (_, i) => ({
      id: `e${i}`,
      from: String(i % 50),
      to: String((i + 1) % 50),
    }));
  }
  if (state === 'Bounds')
    nodes = Array.from({ length: 51 }, (_, i) => ({ ...nodes[0]!, id: String(i) }));
  if (state === 'Empty') {
    nodes = [];
    edges = [];
  }
  if (state === 'Invalid graph') edges = [{ id: 'invalid', from: 'missing', to: 'review' }];
  const scoped = (id: string) => (version === 1 ? id : `${version}-${id}`);
  nodes = nodes.map((node) => ({ ...node, id: scoped(node.id) }));
  edges = edges.map((edge) => ({
    ...edge,
    id: scoped(edge.id),
    from: scoped(edge.from),
    to: scoped(edge.to),
  }));
  const availability: WorkflowGraphProps['state'] = revoked
    ? 'denied'
    : state === 'Loading'
      ? 'loading'
      : state === 'Denied'
        ? 'denied'
        : state === 'Unavailable'
          ? 'unavailable'
          : state === 'Error'
            ? 'error'
            : state === 'Unknown'
              ? 'unknown'
              : state === 'Stale'
                ? 'stale'
                : state === 'Streaming'
                  ? 'streaming'
                  : 'ready';
  function inspect(next: GraphSelection) {
    if (state === 'Selection pending') setRequest({ selection: next, version });
    else setSelection(next);
    onEvent(`Host received ${next.kind} inspection intent.`);
  }
  const current =
    request?.version === version &&
    !revoked &&
    (request.selection.kind === 'node'
      ? nodes.some((node) => node.id === request.selection.id)
      : edges.some((edge) => edge.id === request.selection.id));
  return (
    <div className={styles.root}>
      <WorkflowGraph
        nodes={nodes}
        edges={edges}
        selection={selection}
        onSelect={(node) => inspect({ kind: 'node', id: node.id })}
        onEdgeSelect={(edge) => inspect({ kind: 'edge', id: edge.id })}
        variant={resolveVariant('WorkflowGraph', presentation)}
        title="Agent workflow"
        source="Synthetic host workflow"
        version={`v${version}`}
        state={availability}
        error="Workflow history could not be loaded."
      />
      {request && (
        <div className={styles.controls}>
          <p>
            {current
              ? 'Inspection request awaiting synthetic host acknowledgement.'
              : 'Request is obsolete; current snapshot inspection is required.'}
          </p>
          <Button
            disabled={!current}
            onClick={() => {
              if (current && request) {
                setSelection(request.selection);
                setRequest(undefined);
                onEvent('Synthetic host acknowledged current inspection.');
              }
            }}
          >
            Acknowledge inspection
          </Button>
        </div>
      )}
      <div className={styles.controls}>
        <Button
          variant="outline"
          onClick={() => {
            setVersion((value) => value + 1);
            onEvent('Synthetic host replaced the immutable workflow snapshot.');
          }}
        >
          Replace workflow snapshot
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setRevoked((value) => !value);
            setRequest(undefined);
            onEvent(revoked ? 'Synthetic access restored.' : 'Synthetic access revoked.');
          }}
        >
          {revoked ? 'Restore workflow access' : 'Revoke workflow access'}
        </Button>
      </div>
      <p>
        Synthetic inspection only. Selection requests do not execute a workflow or confirm an
        outcome.
      </p>
    </div>
  );
}
