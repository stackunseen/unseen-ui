import { z } from 'zod';
import { boundedData } from '../../shared/bounded-data.js';

export interface GraphNode {
  id: string;
  label: string;
  /** Public host-reported execution status; unknown statuses remain unknown. */
  state: string;
  x: number;
  y: number;
  description?: string;
  runId?: string;
  durationMs?: number;
}
export interface GraphWaypoint {
  x: number;
  y: number;
}
export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  kind?: 'dependency' | 'branch' | 'loop';
  state?: string;
  /** Optional bounded polyline guidance in normalized canvas coordinates. */
  waypoints?: readonly GraphWaypoint[];
}
export type GraphSelection = { kind: 'node'; id: string } | { kind: 'edge'; id: string };
const id = z
  .string()
  .max(80)
  .refine(
    (value) =>
      Boolean(value.trim()) &&
      !['__proto__', 'constructor', 'prototype'].includes(value) &&
      !/\p{Surrogate}/u.test(value),
  );
const text = z
  .string()
  .max(200)
  .refine((value) => Boolean(value.trim()));
const nodeSchema = z
  .object({
    id,
    label: text,
    state: text.max(80),
    x: z.number().finite().min(12).max(88),
    y: z.number().finite().min(12).max(88),
    description: z.string().max(2000).optional(),
    runId: id.optional(),
    durationMs: z.number().finite().nonnegative().optional(),
  })
  .strict();
const edgeSchema = z
  .object({
    id,
    from: id,
    to: id,
    label: text.optional(),
    kind: z.enum(['dependency', 'branch', 'loop']).optional(),
    state: text.max(80).optional(),
    waypoints: z
      .array(
        z
          .object({ x: z.number().finite().min(2).max(98), y: z.number().finite().min(2).max(98) })
          .strict(),
      )
      .max(8)
      .optional(),
  })
  .strict();
export function inspectWorkflow(nodes: readonly GraphNode[], edges: readonly GraphEdge[]) {
  if (
    !Array.isArray(nodes) ||
    !Array.isArray(edges) ||
    nodes.length > 50 ||
    edges.length > 100 ||
    !boundedData({ nodes, edges })
  )
    return undefined;
  const data = z
    .object({ nodes: z.array(nodeSchema), edges: z.array(edgeSchema) })
    .safeParse({ nodes, edges });
  if (!data.success) return undefined;
  const normalized = data.data;
  const byId = new Map(normalized.nodes.map((node) => [node.id, node]));
  if (
    byId.size !== nodes.length ||
    new Set(normalized.edges.map((edge) => edge.id)).size !== edges.length ||
    normalized.edges.some((edge) => !byId.has(edge.from) || !byId.has(edge.to))
  )
    return undefined;
  const incoming = new Map(
    normalized.nodes.map((node) => [
      node.id,
      normalized.edges.filter((edge) => edge.to === node.id),
    ]),
  );
  const outgoing = new Map(
    normalized.nodes.map((node) => [
      node.id,
      normalized.edges.filter((edge) => edge.from === node.id),
    ]),
  );
  return { ...normalized, byId, incoming, outgoing };
}
export type WorkflowModel = NonNullable<ReturnType<typeof inspectWorkflow>>;
export interface WorkflowOutlineEntry {
  nodeId: string;
  depth: number;
  edge?: GraphEdge;
  reference?: 'cycle' | 'shared';
  component: number;
  cyclicEntry?: boolean;
}
/** Bounded discovery projection; this is never an execution sequence. */
export function workflowOutline(model: WorkflowModel) {
  const entries: WorkflowOutlineEntry[] = [],
    visited = new Set<string>();
  let component = 0;
  function visit(
    nodeId: string,
    depth: number,
    ancestors: Set<string>,
    edge?: GraphEdge,
    cyclicEntry?: boolean,
  ) {
    if (visited.has(nodeId)) {
      entries.push({
        nodeId,
        depth,
        edge,
        reference: ancestors.has(nodeId) ? 'cycle' : 'shared',
        component,
      });
      return;
    }
    visited.add(nodeId);
    entries.push({ nodeId, depth, edge, component, cyclicEntry });
    const next = new Set(ancestors).add(nodeId);
    for (const connection of model.outgoing.get(nodeId)!)
      visit(connection.to, depth + 1, next, connection);
  }
  for (const node of model.nodes.filter((node) => !model.incoming.get(node.id)!.length)) {
    if (!visited.has(node.id)) {
      component++;
      visit(node.id, 0, new Set());
    }
  }
  for (const node of model.nodes)
    if (!visited.has(node.id)) {
      component++;
      visit(node.id, 0, new Set(), undefined, true);
    }
  return entries;
}
