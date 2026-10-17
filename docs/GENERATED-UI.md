# Validated generated interfaces

GeneratedUI renders a closed data vocabulary with **stack**, **cards** and **compact** presentations. It reuses AIForm, Chart and the internal table renderer that Chart also uses. Import from `@stackunseen/ui` with scoped styles; no new package, protocol client or renderer peer is required.

Generated data supplies descriptions/schema, never callbacks, JSX, HTML, raw MDX, scripts, arbitrary component names, CSS or executable validators. A trusted host assembles transport events into supported validated snapshots. This is not an A2UI/AG-UI/MCP Apps implementation.

## Surface vocabulary

`surface: unknown` validates as `{id, version, nodes}`. ID/version and globally unique node IDs are nonblank, at most 80 units and exclude prototype keys and unpaired Unicode surrogates. Valid multilingual/emoji identifiers remain supported. Action IDs are unique across buttons/forms. A changed definition requires a new immutable version; the host owns that invariant across history/remounts. A version label alone cannot prove it.

| Node | Closed properties |
| --- | --- |
| text | id, type, text; inert text preserves line breaks |
| metric | id, type, label, value; host supplies value/meaning |
| action | id, type, label, actionId, optional disabledReason |
| table | id, type, caption, columns, rows with declared scalar cells |
| chart | id, type, title, unit, source, points or aligned series, optional asOf/locale; finite values or explicit null series gaps |
| form | id, type, title, actionId, fields, optional arrays/steps using AIForm definitions |
| section | id, type, title, optional description/layout, nodes; layout stack or grid |
| list | id, type, items (1 to 50 inert strings), optional ordered |
| callout | id, type, tone (`info`, `warning` or `danger`), title, optional text; rendered with Alert, so the tone always has an icon and a title |
| options | id, type, label, actionId, choices (2 to 12, unique `value`, label, optional description), optional disabledReason |
| steps | id, type, title, steps (1 to 20, unique id, label, state `done`, `current` or `upcoming`; at most one current); rendered with Stepper |
| image | id, type, src (http(s), no credentials), alt (required), optional caption |
| metricGroup | id, type, title, metrics (1 to 8 label/value pairs the host supplied) |

Unknown types/properties, invalid form dependencies/steps, duplicate identities, ambiguous tables and excessive input produce a whole-surface fallback. Sections are named groups, not repeated landmarks. Nested layout cannot override the consumer theme or provide arbitrary styles.

Callouts have no success tone. A generated surface can't report that something worked; that comes from a host receipt, so only notes, warnings and problems can be highlighted.

An **options** node is a single choice. Pressing a choice sends `{surfaceId, version, nodeId, actionId, value}` through `onAction`, and nothing is marked as chosen until the host returns a matching `actionStates` snapshot whose `value` names the choice. The status line then reads, for example, "Host reported completion. Choice: Raj." While a snapshot is pending, complete, denied or unknown, every choice is disabled, the same as an action. Options share the action ID namespace, so an action and an options node can't use the same `actionId`.

An **image** loads only from an origin the host lists in `imageOrigins` (for example `['https://images.example.com']`). Without a matching origin, the node shows its alt text and caption with a notice naming the origin, and the browser makes no request. That keeps a surface from making the browser contact an arbitrary server. The image itself goes through the Image component, which shows a placeholder if it fails to load.

Legacy flat surfaces remain supported within stricter ID/nonblank-label bounds. Existing button requests retain `{surfaceId, version, actionId}` without extra properties. Missing `onAction` disables buttons with an explicit notice. Clicking does not locally imply pending/completion.

## Streaming line format

A model can write the same vocabulary one statement per line so the interface appears while the text arrives:

```text
root = [summary, open, tickets]
summary = text("Three tickets are still open.")
open = metric("Open tickets", "3")
tickets = table("Open tickets", [{id: "title", label: "Title"}], [{id: "t1", cells: {title: "Login fails"}}])
```

`name = node(args)` with positional arguments in the documented order; `root` lists the top-level node names and must appear exactly once; the name becomes the node id; strings use JSON quoting; lists use `[ ]`, records `{ }`; a node name is allowed only in `root` and in a section's `nodes` list. Comments start with `#`.

`createSurfaceParser({ surfaceId, version })` from `@stackunseen/ui-core` returns `push(chunk)`, `finish()` and `state()`. Each call returns `{ surface, pending, problems, statements, complete }`: `surface` is the `{ id, version, nodes }` snapshot built from the complete lines so far (null until `root` arrives), `pending` lists names referenced but not yet defined, and `problems` lists dropped lines with a line number and a code (`syntax`, `unknown-node`, `bad-arity`, `bad-reference`, `duplicate`, `limit`, `no-root`). Only complete lines are read; call `finish()` when the stream ends. `parseSurfaceProgram(text, options)` does both in one call. The parser evaluates nothing and validates nothing beyond shape and arity; pass its `surface` to GeneratedUI, which runs the full validation, and its `problems` to the new `problems` prop, which lists what could not be shown under the result. Every split of a program settles to the same snapshot, which the tests check for each character position.

Limits: 256 statements, 20,000 characters per line, 200,000 per program, values nested at most 8 deep, names of at most 80 characters. The surface limits (64 nodes, 3 section levels, table and chart bounds, and the list, options, steps and metric group bounds above) still apply at validation.

`describeSurfaceVocabulary()` returns plain text with the rules, the limits, every node signature and an example, derived from the same table the parser reads, so prompt and parser cannot drift. Paste it into a system prompt; set `examples: false` to leave the example out. The example program itself is exported as `surfaceExampleProgram`.

## Action placement and host emphasis

Adjacent standalone action nodes share one wrapping action rail in each presentation, retaining supplied order, node IDs and feedback beneath their own action. A text, metric, table, form or section ends that rail; actions inside a section stay local to that section. Cards give the whole rail one card surface, instead of adding a card around every button. Default buttons use the shared small outlined presentation. Button labels never imply danger, permission or priority.

The optional trusted `actionPresentations: GeneratedActionPresentation[]` supplies `{surfaceId, version, actionId, variant}`. Supported variants reuse Button: `primary`, `secondary`, `outline`, `ghost`, `danger`. Bindings apply only to the exact current surface/version/action. Valid obsolete or unrelated bindings are discarded, returning to the quiet default. These records apply to standalone action buttons; canonical form submission keeps its own hierarchy.

Presentation is host-owned. Generated action nodes still cannot carry variants, classes, styles or callbacks; those properties invalidate the surface. A current duplicate binding makes that action ambiguous, disables it and uses an outlined fallback with an explicit notice. Malformed records, accessors, unknown properties, unsupported variants or a list above 64 bindings disable all standalone actions with an explicit presentation notice. Plain-data preflight precedes strict schema validation without invoking getters. This does not evaluate host authorization or prove action safety.

```tsx
<GeneratedUI
  surface={validatedSnapshot}
  state="ready"
  actionPresentations={[
    { surfaceId: validatedSnapshot.id, version: validatedSnapshot.version, actionId: 'review', variant: 'primary' },
  ]}
  onAction={requestAuthorizedAction}
/>
```

When a focused action disappears through a denied/hidden snapshot or changed node set, focus returns to the named result group. Focus outside the result is preserved. Stable rail keys preserve an existing action while adjacent actions are inserted; DOM order remains keyboard order.

## Controlled forms

`forms: Record<nodeId, GeneratedFormSnapshot>` supplies `{surfaceId, version, nodeId, values, arrayValues?, step?, draftVersion?, status?, errors?, arrayErrors?, receipt?}`. Identity must match current surface/form. Missing, invalid or obsolete bindings hide values. Ready forms need `onFormChange` and `onAction`; pending/complete snapshots may remain read-only without them.

`onFormChange(GeneratedFormRequest)` emits surface/version/node/draft identity and a `values`, `array` or `step` request. Array change reuses AIArrayChange; hosts allocate stable row IDs and supply replacement data. No optimistic authoritative row/value/step state is created. AIForm validation, conditional omission, focus/error reconciliation and layouts are reused: stack maps to stacked, cards to grid, compact to compact.

Form submission emits `onAction({surfaceId, version, nodeId, actionId, form: {values, submission}})`. Submission contains normalized active values, repeated rows and AIForm identity. Form ID is node ID, schema version is surface version, optional draft revision is host supplied. Revalidate requests server-side against authorized action scope and immutable schema regardless of disabled UI.

`GeneratedFormReceipt` supplies surface/version/node/draft identity, message and optional submissionId. Complete status displays only a matching receipt; obsolete/missing acknowledgements stay unavailable. Matching props do not prove a real server acted. Pending locks the visible form. Persistence, concurrency, restore and unknown pending outcomes remain host-owned; do not reconnect/retry side effects automatically.

```tsx
<GeneratedUI
  variant="cards"
  surface={validatedSnapshot}
  state={host.availability}
  forms={host.forms}
  onFormChange={requestDraftReplacement}
  actionStates={host.actionStates}
  onAction={requestAuthorizedAction}
/>
```

Callbacks/state belong in a Client Component. [Consumer example](../examples/consumer/src/generated-example.tsx) compiles in Vite and packed Next consumers. It explicitly simulates local acknowledgement, without persistence/external service.

## Availability and action feedback

| State | Behavior |
| --- | --- |
| ready | Validated current content; connected/permitted controls can emit requests |
| streaming | Validated partial snapshot labelled receiving; buttons locked, form values hidden until ready |
| pending | Snapshot visible, controls locked; host confirmation required |
| stale | Historical text/table/chart labelled stale; actions locked, form values hidden |
| loading / denied / unavailable / error | Surface is not traversed/rendered; status/loading/error fallback only |

`actionStates: GeneratedActionSnapshot[]` describes standalone buttons with surface/version/action identity, pending/complete/error/denied/unknown status, optional message/submissionId. Pending/complete/denied/unknown lock the action; error allows an explicit request only while ready. Unknown asks the host to reconcile before retry. Nothing repeats automatically.

Only one matching record may describe an action. Duplicate/malformed or obsolete records disable it and hide old messages. Hosts replace stale records after reconciliation. Completion is host-reported UI state, not independent execution proof. Forms use their separate binding rather than competing button state.

## Bounds

Surface-wide limits: 64 nodes, three nested section levels, 200 table rows/2,000 potential cells, 120 chart points, 200 potential form controls. Individual tables retain 100 rows/20 columns; charts 60 finite points; form definitions reuse 50 fields, ten arrays, 20 rows/group, ten steps and 100 options. Potential repeatable controls use declared maximum rows (default 20), even before rows arrive.

Current visible host form snapshots also share an actual 200-control bound across all forms. Correctable rows above a declared group count remain supported within that global bound; canonical per-form hard row limits still apply. Oversized current host snapshots receive an explicit surface fallback instead of rendering thousands of controls across individually valid forms. Parent pending/streaming states cannot widen a child's denied/loading/stale/unavailable state. Matching completed form receipts remain settled while another surface action is pending.

Plain-data preflight rejects accessors, cycles, functions, symbols and nonplain objects without invoking accessor values. Before Zod, it caps 12,000 visited values, 200,000 aggregate string units, 10,000 units/string and data depth 14. Labels are 200 units; section descriptions 2,000. Proxies, transport limits and arbitrary-input resource isolation remain host boundaries; these checks are not hard CPU/memory deadlines. Host form bindings receive bounded/type checks before controls.

Charts retain intrinsic local scroll width and equivalent data tables; card tables reuse responsive row cards. Chart nodes accept legacy points or aligned series with null gaps, optional locale/asOf and the shared [chart validation](CHARTS.md). All samples across all series/nodes share the existing 120-sample limit, including null. Generated content cannot supply legend/formatter callbacks. Consumer density/colors/borders/icons apply to reused children. See [forms](FORMS.md) for field and submission contracts.
