# Coding and structured UI

These components render host data and emit intent. They do not run commands, authorize access, record audio, persist drafts or execute model-generated code. Every family has three presentation variants; see [the variant registry](VARIANTS.md).

## Coding workspace

| API | Contract and bounds |
| --- | --- |
| SlashCommandMenu / MentionPicker | Controlled query and selection, cmdk keyboard navigation, loading/error/empty/disabled states, first 200 host options. References include kind and version. The host owns search, authorization and resource resolution. |
| ReasoningControl | Controlled provider-declared effort IDs, discrete Radix slider, segmented radios or custom Select. This is an effort setting, not a view into private reasoning. Unsupported settings remain explicit. |
| AccessModeSelector | Current host mode is distinct from a local draft. Requests carry mode, scope and policy version. Drafts are invalidated when scope/version changes. A click does not confer permission. |
| [VoiceControl](VOICES.md) | Exact session/capture/version snapshots, independent capture/permission/transcription/availability/connection/submission, scoped requests and legacy compatibility. Three layouts reuse compact action groups, devices and keyboard-scrollable transcripts. The optional browser example records audio; it provides no speech-to-text service. |
| [FileExplorer](FILES.md) | Controlled snapshot-bound selection, disclosures, file windows and filtering; explicit access/freshness and unknown metadata. Three distinct projections, 500 records/500 derived folders/12 folder levels, invalid windows rejected. Native disclosure/list semantics; host owns reads. A separate sample host provides bounded local reads. |
| CodeDiff | Immutable before/after source and versions; jsdiff line comparison with time/edit bounds. Unified, split and compact views retain line numbers and addition/removal markers; split replacements align by position. Combined source limit 60,000 UTF-16 units / 1,500 output rows. Version-bound original-source copy; explicit ready/loading/conflict/denied/error/unavailable states. It never applies a patch. |
| [TerminalOutput / TerminalEmulator](TERMINALS.md) | Canonical bounded plain transcript with exact scope, availability, connection, submission and scoped actions; independent optional xterm/Fit entry for ANSI, keyboard and resize. A separate fixed-program PTY/HTTP example executes outside packages. Hosts own authorization/checkpoints/receipts; general terminal restoration remains open. |
| TestResults | Up to 300 results with explicit states, measured durations and disclosed diagnostics. Open-file callbacks are host actions. |

The gallery's **Coding studio** composes these APIs. Typing `/` or `@` opens a searchable picker; selection inserts text and explicit reference chips. File, diff, terminal and test examples use fixed synthetic data. The recipe is available in `apps/docs/components/coding-studio.tsx`; it does not imply a reusable editor runtime or real coding-agent integration.

Plain and optional highlighted code share three styles through `/code` and `/highlight`. The optional Shiki tokenizer covers ten fixed languages with bounded, inert tokens and explicit plain fallbacks. It composes into Markdown through a trusted application callback. `HighlightedCodeDiff` from `/highlight` reuses the same engine for both complete source versions and the canonical CodeDiff presentation; no Shiki peer is required by base CodeDiff. Read [rich response contracts](RICH-RESPONSES.md). Editor intelligence and production/general PTY transport remain open; [terminal contracts](TERMINALS.md) cover the fixed public local example.

CodeDiff requires nonempty immutable identifiers; one identifier cannot denote two differing source strings. Invalid or oversized snapshots hide source and disable copying. Error text is bounded to 1,000 units. Copy uses original props, including CRLF, and obsolete receipts are discarded after source/path/version/access changes. `copyable={false}` hides copy controls. The component cannot revoke text already copied or authorize host access.

A trusted `renderLine(line: CodeDiffLine)` callback can render an already bounded, visible line with its kind, original line numbers and before/after side. Model content cannot supply callbacks. The highlighted wrapper owns this callback, tokenizes each full document once to retain multiline grammar state, checks exact line identity and binds results to path and immutable versions. It retains plain comparison on unsupported/failed/limited highlighting. Tokens are shown only when both nonempty documents are ready, on neutral theme surfaces; addition/removal gutters and signs keep semantic colours. Hidden states do not tokenize or retain visible source.

## Conversation and review

ThreadList, BranchSwitcher and MessageQueue provide controlled selection, search, versioned edits and pending states. Thread pagination/scroll restoration and queue reorder callbacks require host storage and reconciliation. Missing selected branches are reported rather than silently replaced. Renaming and editing drafts bind the version they were opened against.

Use the [conversation contracts](CONVERSATIONS.md) for snapshot scope, paging, draft guards and original receipt checks. [ConversationViewport](HISTORY-VIEWPORT.md) provides measured history scrolling. The IndexedDB example saves locally; provider history and sending require a host integration.

AgentHandoff displays owner, destination, scope and context/access provenance. Acceptance emits a request; ownership changes only when the host sends an acknowledged state. ReviewChanges binds decisions to base/proposal versions, blocks conflicts and stale/pending proposals, and rejects proposals above its 50-change review bound. ArtifactDiff compares explicitly selected versions and hides denied content. MemoryControls exposes versioned correction/deletion intents and hides revoked values.

## Structured content

AIForm renders text, textarea, number, checkbox and select schemas, repeatable rows and controlled steps. Stable row IDs preserve field identity during reordering; submission validates active fields and binds matching host receipts. See [forms](FORMS.md) for schemas, bounds and callbacks.

GeneratedUI renders a bounded catalog of text, metric, action, table, chart, form and section nodes. Identity, host action feedback, controlled form drafts and availability determine what it can display. Generated HTML, callbacks and executable React are forbidden. See [generated interfaces](GENERATED-UI.md) for the complete schema and limits.

DataTable has a caption, typed scalar cells, controlled sorting, loading/error states and host pagination callbacks. Cards retain sorting controls. The display is bounded to 100 rows / 20 columns. [Chart](CHARTS.md) renders legacy points or up to four aligned series as bar/line/area, with null gaps, controlled legends, unit/source and hidden availability states. Readable geometry remains in a local scroll region with equivalent original tabular values. Oversized/invalid data is rejected before plotting. Neither API claims a spreadsheet, virtualized grid or advanced chart engine.

DataTable accepts an explicit `locale` (default `en-US`) and column `format: { kind: 'number' | 'date', options? }`. Number options include currency/percent formatting. Dates accept ISO calendar dates, timezone-qualified ISO instants or epoch milliseconds; UTC is the default display zone. Ambiguous date strings and non-finite values have explicit fallbacks. Invalid locales/format options produce visible warnings. A trusted application `formatCell(value, column, row)` can return inert text capped at 5,000 characters; exceptions and invalid return values show a fallback. Generated content cannot provide that callback or HTML.

Controlled `pagination: { pageIndex, pageSize, totalRows?, hasNextPage? }` describes the supplied page, and `onPageChange(index)` requests a replacement window. No optimistic page/row changes occur inside the component. Page size is 1–100; page/row identities and totals must be consistent. Unknown totals remain unknown and require explicit `hasNextPage: true` to enable Next. Sorting while loading and paging without a handler are disabled. Empty table views include an explanatory data row, not orphaned column headers. The legacy `onLoadMore` intent remains available; prefer one paging mechanism per view.

```tsx
<DataTable
  caption="Measured costs"
  locale="de-DE"
  columns={[{ id: 'cost', label: 'Cost', format: { kind: 'number', options: { style: 'currency', currency: 'EUR' } } }]}
  rows={page.rows}
  pagination={{ pageIndex: page.index, pageSize: 25, totalRows: page.total }}
  onPageChange={requestPage}
/>;
```

[WorkflowGraph](WORKFLOWS.md) validates one bounded current snapshot, projects a routed canvas, adjacency list or compact traversal outline and exposes controlled node/connection inspection. Self/return/parallel routes, explicit cycle/shared references, optional host data waypoints and complete equivalent connections preserve host ownership. Overlap/unroutable/label-capacity conditions are disclosed; hidden availability hides data before inspection. It is not a graph editor, general layout engine or workflow executor. AuditTrail provides searchable timeline/table/compact views with redaction. RunInspector displays public spans, correlation IDs and measured/unknown usage; it must not be fed private model reasoning.

## Integration and styling

Components use the shared stylesheet and [theme tokens](THEMING.md). Host callbacks require server-side validation regardless of a control's disabled state.