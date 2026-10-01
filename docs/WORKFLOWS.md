# Workflow inspection

`WorkflowGraph` has three presentations: **graph** is a routed read-only canvas, **list** is node adjacency with incoming/outgoing disclosures, and **compact** is a bounded discovery outline with explicit cycle/shared-node references. All views use the same validated snapshot and controlled selection. Import from `@ai-interaction/react` with scoped styles; no graph engine or new dependency is required.

```tsx
import { WorkflowGraph } from '@ai-interaction/react';
import type { GraphSelection } from '@ai-interaction/react';

// These values belong to the host. Handlers request inspection, never execution.
<WorkflowGraph nodes={nodes} edges={edges} source="Host public workflow"
  version="snapshot-42" selection={selection}
  onSelect={(node) => requestSelection({ kind: 'node', id: node.id })}
  onEdgeSelect={(edge) => requestSelection({ kind: 'edge', id: edge.id })}
  variant="graph" />;
```

## Snapshot and selection

GraphNode retains `id`, `label`, `state`, `x`, `y`, with optional `description`, `runId` and host-measured `durationMs`. Description contains only public summaries; private model reasoning is outside this API. StatusBadge/icon-provider/theme are reused. Unfamiliar reported statuses render Unknown and retain the raw inert state in the inspector. Absent duration/run/source metadata is explicitly unknown/not supplied. The component never fabricates progress, outcomes or evidence.

GraphEdge retains `id`, `from`, `to`, optional `label`; optional `kind` is dependency/branch/loop, `state` is reported text and `waypoints` is bounded data routing guidance. Absent kind/state is not supplied/unknown. Direction/routing back toward a prior x-coordinate is a diagram return route, not proof of an execution retry or cycle. Outline cycle references derive only from actual ancestor relationships. No attempt count or policy permission is inferred.

`selection: GraphSelection` is `{kind: 'node' | 'edge', id}` as a discriminated union. Legacy `selectedId` still selects a node; do not combine it with selection. Clicks emit the existing `onSelect(node)` or optional `onEdgeSelect(edge)` and wait for changed props. Buttons do not imply selection acknowledgement. Missing handlers disable inspection with an explicit node notice; read-only data remains available. Unknown/ambiguous/obsolete selections hide inspector content and show a current-snapshot notice while preserving current data. IDs refer to the supplied snapshot, not immutable history; the host owns versions, access, async request identity and reconciles obsolete acknowledgements.

Node inspector shows current public description/state/run/duration and incoming/outgoing connections. Connection inspector shows current endpoints, label/type/state and routing provenance. Endpoint buttons and relation controls request inspection through the same callbacks. No execution/retry/approval handler is exposed. Local state only handles disclosure/focus, never host execution or authoritative selection. An inspector removed during selection/data replacement transfers focus to the named workflow group only when its previously focused element disappeared and focus otherwise fell to body; external focused controls keep focus.

## Routing and equivalent views

Bounds: **50 nodes / 100 edges**, unique nonblank IDs up to 80 units (prototype keys/unpaired surrogates rejected), labels up to 200, state up to 80, public description up to 2,000, finite nonnegative duration. Coordinates remain normalized **12–88** in both dimensions. Up to eight routing points per edge, normalized **2–98**, are plain validated data, never raw SVG/CSS/path expressions. The shared plain-data preflight rejects accessors, cycles, functions and nonplain objects before schema traversal. Bounds are not hard CPU/memory deadlines or proxy isolation.

The canvas is 960px wide with fixed 148×80px node faces and at least 600px height, growing to at most 1,200px for the 50-node window. SVG uses matching pixel coordinates without stretching text/arrowheads; local scroll preserves readable nodes. Routing uses bounded candidate polylines around expanded node rectangles, separate self/return paths and offsets for parallel edges. Host waypoints can guide a polyline. All routes must stay in bounds and avoid node faces; automatic routing is not a global graph layout or general path-planning engine. Hosts supply separated positions and replace windows when needed.

Node overlap replaces the canvas with the complete node list and a notice. A connection that cannot route is explicitly counted and omitted from the diagram; its full relationship remains in Connections. A label that cannot fit is similarly disclosed; connection IDs remain in the equivalent data. This never silently deletes source relationships or invents a successful route. Connection numbering follows supplied edge order; stable IDs, not E numbers, identify callbacks. Keep host ordering stable when appropriate.

List uses per-node incoming/outgoing accordions. Compact outlines discovery order using supplied node/edge ordering; it is explicitly **not execution order**. Each node expands once; additional ancestor/shared links are references, including cyclic components without a zero-incoming entry. All disconnected components remain present. At most 150 outline entries; visual indentation caps at three levels while deeper depth is explicit text. Native list/button semantics are used, not an incomplete ARIA tree widget. Graph has equivalent node and connection disclosures; nested/repeated accordions are labeled groups rather than duplicate landmarks.

Keyboard: focus the diagram group for native scrolling. One graph node is in the tab sequence; arrow keys move focus to the nearest node in that direction, Home/End choose supplied first/last, Enter/Space request inspection. Focus movement never changes selection. Lists/outlines/connection data use normal Tab/Enter and shared Accordion keys. Selection remains controlled across layout changes. This is a locally tested keyboard contract, not a screen-reader certification.

## Availability

`state` defaults to ready. Loading/denied/unavailable/error/unknown and unexpected runtime states hide all snapshot/provenance/inspector content before data inspection. Stale shows an explicitly historical snapshot; streaming shows provisional data. Both pause inspection requests. Access/freshness is host-owned; revocation cannot retract information already inspected elsewhere. `source` and `version` are bounded host text, not independent provenance verification or transport compatibility.

The gallery/consumer demonstrate synthetic current/obsolete acknowledgements and access replacement. They do not schedule/execute a workflow or establish AG-UI/A2A/MCP/provider integration.
