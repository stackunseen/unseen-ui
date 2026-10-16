'use client';
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Button } from '../button/button.js';
import { Accordion } from '../accordion/accordion.js';
import { LoadingIndicator } from '../loading-indicator/loading-indicator.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import { inspectWorkflow, workflowOutline } from './workflow-model.js';
import { routeWorkflow, workflowCanvas } from './workflow-routing.js';
import type { GraphNode, GraphEdge, GraphSelection, WorkflowModel } from './workflow-model.js';
import type { DetailProps, VariantProps } from '../../shared/variants.js';
import css from './workflow-graph.module.css';
import g from '../../shared/styles/structured.module.css';
import c from '../../shared/styles/coding.module.css';
import s from '../../shared/styles/agent-controls.module.css';

export type { GraphNode, GraphEdge, GraphWaypoint, GraphSelection } from './workflow-model.js';
export interface WorkflowGraphProps extends VariantProps<'WorkflowGraph'>, DetailProps {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  /** Legacy controlled node selection; do not combine with selection. */
  selectedId?: string;
  selection?: GraphSelection;
  onSelect?: (node: GraphNode) => void;
  onEdgeSelect?: (edge: GraphEdge) => void;
  title?: string;
  source?: string;
  version?: string;
  state?:
    'ready' | 'streaming' | 'stale' | 'loading' | 'denied' | 'unavailable' | 'error' | 'unknown';
  error?: string;
}
/** Below this the diagram scrolls instead of shrinking further. */
const minScale = 0.6;
export function WorkflowGraph({
  nodes,
  edges,
  title = 'Agent workflow',
  source,
  version,
  state = 'ready',
  error,
  detail = 'compact',
  ...props
}: WorkflowGraphProps) {
  const root = useRef<HTMLDivElement>(null),
    focused = useRef<HTMLElement | null>(null);
  const visible = ['ready', 'streaming', 'stale'].includes(state);
  const model = useMemo(
    () => (visible ? inspectWorkflow(nodes, edges) : undefined),
    [nodes, edges, visible],
  );
  useLayoutEffect(() => {
    if (focused.current && !focused.current.isConnected && document.activeElement === document.body)
      root.current?.focus({ preventScroll: true });
  }, [nodes, edges, state, props.selection, props.selectedId]);
  const heading = typeof title === 'string' ? title.slice(0, 2000) : 'Agent workflow';
  const frame = (children: ReactNode) => (
    <div
      ref={root}
      role="group"
      tabIndex={-1}
      className={`${g.root} ${css.root}`}
      data-part="workflow-graph"
      data-variant={props.variant ?? 'graph'}
      data-state={state}
      data-detail={detail}
      aria-label={heading}
      onFocusCapture={(event) => {
        focused.current = event.target as HTMLElement;
      }}
      onBlurCapture={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node))
          focused.current = null;
      }}
    >
      <strong>{heading}</strong>
      {children}
    </div>
  );
  if (state === 'loading') return frame(<LoadingIndicator label="Loading workflow" />);
  if (!['ready', 'streaming', 'stale', 'denied', 'unavailable', 'error'].includes(state))
    return frame(
      <p role="status" className={s.muted}>
        Workflow availability is unknown. Request a current host snapshot.
      </p>,
    );
  if (['denied', 'unavailable', 'error'].includes(state))
    return frame(
      <p role="status" className={g.error}>
        {state === 'denied'
          ? 'Workflow access denied.'
          : state === 'unavailable'
            ? 'Workflow unavailable.'
            : typeof error === 'string' && error.trim()
              ? error.slice(0, 1000)
              : 'Workflow failed to load.'}
      </p>,
    );
  if (!model)
    return frame(
      <p role="alert" className={g.error}>
        Workflow coordinates, references or preview limits are invalid.
      </p>,
    );
  return frame(
    <>
      {detail === 'full' && (
        <p className={s.muted}>
          {model.nodes.length} nodes · {model.edges.length} connections · Source:{' '}
          {typeof source === 'string' && source.trim() ? source.slice(0, 2000) : 'Not supplied'}
          {typeof version === 'string' && version.trim()
            ? ` · Snapshot: ${version.slice(0, 200)}`
            : ''}
        </p>
      )}
      {state === 'streaming' && (
        <p role="status" className={s.muted}>
          Provisional workflow snapshot. Inspection is paused while it changes.
        </p>
      )}
      {state === 'stale' && (
        <p role="status" className={s.muted}>
          Historical workflow snapshot. Refresh before requesting inspection.
        </p>
      )}
      <WorkflowView {...props} detail={detail} model={model} interactive={state === 'ready'} />
    </>,
  );
}
function WorkflowView({
  model,
  selectedId,
  selection,
  onSelect,
  onEdgeSelect,
  variant = 'graph',
  detail = 'compact',
  interactive,
}: Omit<WorkflowGraphProps, 'nodes' | 'edges'> & { model: WorkflowModel; interactive: boolean }) {
  const prefix = `workflow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [focusedId, setFocusedId] = useState<string>();
  const scroller = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      if (!element.clientWidth) return;
      setScale(Math.max(minScale, Math.min(1, element.clientWidth / workflowCanvas.width)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [variant]);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const selected =
    selection ?? (selectedId ? { kind: 'node' as const, id: selectedId } : undefined);
  const invalidSelection =
    Boolean(selection && selectedId) ||
    Boolean(
      selected &&
      (selected.kind === 'node'
        ? !model.byId.has(selected.id)
        : selected.kind !== 'edge' || !model.edges.some((edge) => edge.id === selected.id)),
    );
  const nodeSelected =
    !invalidSelection && selected?.kind === 'node' ? model.byId.get(selected.id) : undefined;
  const edgeSelected =
    !invalidSelection && selected?.kind === 'edge'
      ? model.edges.find((edge) => edge.id === selected.id)
      : undefined;
  const activeId =
    focusedId && model.byId.has(focusedId) ? focusedId : (nodeSelected?.id ?? model.nodes[0]?.id);
  const edgeNumber = (edge: GraphEdge) =>
    `E${model.edges.findIndex((item) => item.id === edge.id) + 1}`;
  function selectNode(node: GraphNode) {
    if (interactive) onSelect?.(node);
  }
  function selectEdge(edge: GraphEdge) {
    if (interactive) onEdgeSelect?.(edge);
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, node: GraphNode) {
    let target: GraphNode | undefined;
    if (event.key === 'Home') target = model.nodes[0];
    else if (event.key === 'End') target = model.nodes.at(-1);
    else if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      const horizontal = event.key === 'ArrowRight' || event.key === 'ArrowLeft',
        forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
      target = model.nodes
        .filter((next) => (horizontal ? next.x - node.x : next.y - node.y) * (forward ? 1 : -1) > 0)
        .sort(
          (a, b) =>
            Math.hypot(
              (a.x - node.x) * workflowCanvas.width,
              (a.y - node.y) * (routing?.canvas.height ?? workflowCanvas.height),
            ) -
            Math.hypot(
              (b.x - node.x) * workflowCanvas.width,
              (b.y - node.y) * (routing?.canvas.height ?? workflowCanvas.height),
            ),
        )[0];
    } else return;
    event.preventDefault();
    if (target) {
      setFocusedId(target.id);
      buttons.current.get(target.id)?.focus();
    }
  }
  function nodeLink(node: GraphNode) {
    return (
      <Button
        variant="ghost"
        aria-label={`${node.label} · ${node.state}`}
        aria-pressed={nodeSelected?.id === node.id}
        disabled={!interactive || !onSelect}
        onClick={() => selectNode(node)}
      >
        {node.label}
      </Button>
    );
  }
  function connection(edge: GraphEdge) {
    return (
      <li key={edge.id} data-connection-id={edge.id}>
        <div className={css.row}>
          <Button
            variant={edgeSelected?.id === edge.id ? 'secondary' : 'ghost'}
            aria-pressed={edgeSelected?.id === edge.id}
            disabled={!interactive || !onEdgeSelect}
            onClick={() => selectEdge(edge)}
            aria-label={`Inspect connection ${edgeNumber(edge)}${edge.label ? `: ${edge.label}` : ''}`}
          >
            {edgeNumber(edge)}
            {edge.label ? ` · ${edge.label}` : ''}
          </Button>
          <span className={css.summary}>{edge.kind ?? 'Type not supplied'}</span>
          {edge.state && <StatusBadge state={edge.state} />}
        </div>
        <p className={s.muted}>
          {model.byId.get(edge.from)!.label} → {model.byId.get(edge.to)!.label}
        </p>
      </li>
    );
  }
  function relations(edges: readonly GraphEdge[], label: string) {
    return edges.length ? (
      <ul className={css.connections} aria-label={label}>
        {edges.map(connection)}
      </ul>
    ) : (
      <p className={s.muted}>No {label.toLowerCase()}.</p>
    );
  }
  const nodeList = (
    <ul className={css.nodeList} aria-label="Workflow node list">
      {model.nodes.map((node) => (
        <li key={node.id} data-workflow-node={node.id}>
          <h3 className={css.heading}>
            {nodeLink(node)}
            <StatusBadge state={node.state} />
          </h3>
          {node.description && <p className={css.description}>{node.description}</p>}
          <Accordion
            region={false}
            headingLevel={4}
            type="multiple"
            items={[
              {
                value: 'incoming',
                title: `${model.incoming.get(node.id)!.length} incoming connections`,
                content: relations(model.incoming.get(node.id)!, 'Incoming connections'),
              },
              {
                value: 'outgoing',
                title: `${model.outgoing.get(node.id)!.length} outgoing connections`,
                content: relations(model.outgoing.get(node.id)!, 'Outgoing connections'),
              },
            ]}
          />
        </li>
      ))}
    </ul>
  );
  const outline = (
    <>
      <p className={css.summary}>
        Discovery order follows the supplied nodes and connections. This is not execution order.
        Repeated nodes are references.
      </p>
      <ol className={css.outline} aria-label="Workflow traversal outline">
        {workflowOutline(model).map((entry, index) => (
          <li
            key={index}
            style={{ marginInlineStart: Math.min(entry.depth, 3) * 12 }}
            data-reference={entry.reference}
            data-depth={entry.depth}
            data-workflow-node={entry.nodeId}
          >
            <div className={css.row}>
              {nodeLink(model.byId.get(entry.nodeId)!)}
              {!entry.reference && <StatusBadge state={model.byId.get(entry.nodeId)!.state} />}
            </div>
            <p className={css.summary}>
              {entry.reference === 'cycle'
                ? 'Cycle reference'
                : entry.reference === 'shared'
                  ? 'Shared node reference'
                  : entry.depth === 0
                    ? `Component ${entry.component}${entry.cyclicEntry ? ' · No entry node; traversal starts here' : ' · Entry in this diagram'}`
                    : `Depth ${entry.depth}`}
              {entry.edge
                ? ` · ${edgeNumber(entry.edge)}${entry.edge.label ? ` · ${entry.edge.label}` : ''}`
                : ''}
            </p>
            {entry.edge && onEdgeSelect && (
              <Button
                variant="ghost"
                disabled={!interactive}
                onClick={() => selectEdge(entry.edge!)}
                aria-label={`Inspect connection ${edgeNumber(entry.edge)}`}
              >
                {edgeNumber(entry.edge)} connection details
              </Button>
            )}
          </li>
        ))}
      </ol>
    </>
  );
  const routing = useMemo(
    () => (variant === 'graph' ? routeWorkflow(model) : undefined),
    [model, variant],
  );
  const missing = routing?.routes.filter((route) => !route.path).length ?? 0;
  const hiddenLabels = routing?.routes.filter((route) => route.path && !route.label).length ?? 0;
  return (
    <>
      {invalidSelection && (
        <p role="status" className={s.muted}>
          Selection is ambiguous or unavailable in this snapshot. Request a current selection.
        </p>
      )}
      {!onSelect && (
        <p className={s.muted}>Node inspection unavailable: no host handler supplied.</p>
      )}
      {!model.nodes.length ? (
        <p className={s.muted}>No workflow nodes reported.</p>
      ) : variant === 'list' ? (
        nodeList
      ) : variant === 'compact' ? (
        outline
      ) : routing?.overlaps ? (
        <>
          <p role="status" className={s.muted}>
            Node positions overlap. Use the node list or supply separated positions.
          </p>
          {nodeList}
        </>
      ) : (
        <>
          {missing > 0 && (
            <p role="status" className={s.muted}>
              {missing} connection{missing === 1 ? '' : 's'} cannot be routed around the current
              positions. Full relationships remain in Connections.
            </p>
          )}
          {hiddenLabels > 0 && (
            <p className={s.muted}>
              {hiddenLabels} connection labels do not fit in the diagram. Full IDs remain in
              Connections.
            </p>
          )}
          <div
            ref={scroller}
            className={c.scroll}
            tabIndex={0}
            role="group"
            aria-label="Workflow diagram"
            data-scale={scale.toFixed(2)}
          >
            <div
              className={css.fit}
              style={{
                width: Math.round(workflowCanvas.width * scale),
                height: Math.round(routing!.canvas.height * scale),
              }}
            >
              <div
                className={css.canvas}
                style={{
                  height: routing!.canvas.height,
                  transform: scale < 1 ? `scale(${scale})` : undefined,
                }}
              >
                <svg
                  viewBox={`0 0 ${routing!.canvas.width} ${routing!.canvas.height}`}
                  aria-hidden="true"
                >
                  <defs>
                    <marker
                      id={`${prefix}-arrow`}
                      viewBox="0 0 10 10"
                      refX={9}
                      refY={5}
                      markerWidth={8}
                      markerHeight={8}
                      markerUnits="userSpaceOnUse"
                      orient="auto"
                    >
                      <path d="M0,0 L10,5 L0,10 Z" fill="var(--ai-muted)" />
                    </marker>
                  </defs>
                  {routing!.routes.map(
                    (route) =>
                      route.path && (
                        <g key={route.edge.id}>
                          <path
                            className={css.edge}
                            data-edge-id={route.edge.id}
                            data-loop={route.loop}
                            data-selected={edgeSelected?.id === route.edge.id}
                            d={route.path}
                            markerEnd={`url(#${prefix}-arrow)`}
                          />
                          {route.label && (
                            <g
                              className={css.edgeNumber}
                              transform={`translate(${route.label!.x},${route.label!.y})`}
                            >
                              <rect x={-18} y={-12} width={36} height={24} rx={4} />
                              <text>E{route.index}</text>
                            </g>
                          )}
                        </g>
                      ),
                  )}
                </svg>
                {model.nodes.map((node) => (
                  <button
                    key={node.id}
                    ref={(button) => {
                      if (button) buttons.current.set(node.id, button);
                      else buttons.current.delete(node.id);
                    }}
                    type="button"
                    className={css.node}
                    data-workflow-node={node.id}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    aria-label={`${node.label} · ${node.state}`}
                    title={`${node.label} · ${node.state}`}
                    aria-pressed={nodeSelected?.id === node.id}
                    disabled={!interactive || !onSelect}
                    tabIndex={node.id === activeId ? 0 : -1}
                    onFocus={() => setFocusedId(node.id)}
                    onKeyDown={(event) => keyboard(event, node)}
                    onClick={() => selectNode(node)}
                  >
                    <span className={css.nodeLabel}>{node.label}</span>
                    <StatusBadge state={node.state} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className={css.summary}>
            {detail === 'full'
              ? 'Focus the diagram to scroll. On nodes, arrows/Home/End move focus; Enter requests inspection. Connection IDs match Connections.'
              : 'Arrow keys move between nodes; Enter inspects.'}
          </p>
          <Accordion
            region={false}
            type="single"
            collapsible
            items={[{ value: 'list', title: 'Workflow as a list', content: nodeList }]}
          />
        </>
      )}
      {!!model.edges.length && (
        <Accordion
          region={false}
          type="single"
          collapsible
          items={[
            {
              value: 'connections',
              title: 'Connections',
              content: relations(model.edges, 'Workflow connections'),
            },
          ]}
        />
      )}
      {nodeSelected && (
        <div
          className={css.inspector}
          role="group"
          aria-label="Selected node details"
          data-part="workflow-inspector"
        >
          <h3 className={css.detailHeading}>{nodeSelected.label}</h3>
          <StatusBadge state={nodeSelected.state} />
          <p className={css.description}>
            {nodeSelected.description || 'No public description supplied.'}
          </p>
          <p className={css.summary}>
            Node ID: {nodeSelected.id} · Reported state: {nodeSelected.state}
          </p>
          <p className={css.summary}>
            Run ID: {nodeSelected.runId ?? 'Not supplied'} · Duration:{' '}
            {nodeSelected.durationMs === undefined
              ? 'Unknown'
              : `${nodeSelected.durationMs} ms (host measured)`}
          </p>
          <Accordion
            region={false}
            headingLevel={4}
            type="multiple"
            items={[
              {
                value: 'incoming',
                title: 'Incoming connections',
                content: relations(model.incoming.get(nodeSelected.id)!, 'Incoming connections'),
              },
              {
                value: 'outgoing',
                title: 'Outgoing connections',
                content: relations(model.outgoing.get(nodeSelected.id)!, 'Outgoing connections'),
              },
            ]}
          />
        </div>
      )}
      {edgeSelected && (
        <div
          className={css.inspector}
          role="group"
          aria-label="Selected connection details"
          data-part="workflow-inspector"
        >
          <h3 className={css.detailHeading}>
            {edgeNumber(edgeSelected)} · {edgeSelected.label ?? 'Unlabelled connection'}
          </h3>
          <p className={css.summary}>
            Connection ID: {edgeSelected.id} · {edgeSelected.kind ?? 'Type not supplied'}
          </p>
          <p className={css.summary}>Reported state: {edgeSelected.state ?? 'Unknown'}</p>
          <div className={css.row}>
            {nodeLink(model.byId.get(edgeSelected.from)!)}
            <span>→</span>
            {nodeLink(model.byId.get(edgeSelected.to)!)}
          </div>
          <p className={css.summary}>
            {edgeSelected.waypoints?.length
              ? `${edgeSelected.waypoints.length} host routing points`
              : 'Automatic bounded routing'}{' '}
            · This relationship does not authorize or prove execution.
          </p>
        </div>
      )}
    </>
  );
}
