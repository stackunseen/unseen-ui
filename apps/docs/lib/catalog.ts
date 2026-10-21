import { componentVariants } from '@stackunseen/ui';
import type { VariantComponent } from '@stackunseen/ui';
import { partStates } from './message-parts-fixtures';
import { expandedCatalog } from './expanded-catalog';
import { genericCatalog } from './generic-catalog';
export const categories = [
  'All components',
  'Actions',
  'Forms',
  'Navigation',
  'Overlays',
  'Feedback',
  'Data Display',
  'Rich Content',
  'Layout',
  'Application patterns',
  'Marketing blocks',
  'AI Components',
] as const;
export type CatalogGroup = Exclude<(typeof categories)[number], 'All components'>;
export type GenericComponent =
  | 'DataGrid'
  | 'Combobox'
  | 'Chip'
  | 'Stepper'
  | 'Matrix'
  | 'CopyButton'
  | 'InputGroup'
  | 'AppearanceToggle'
  | 'CommandPalette'
  | 'TableOfContents'
  | 'ShareMenu'
  | 'Checklist'
  | 'CodeTabs'
  | 'Tag'
  | 'Avatar'
  | 'Stat'
  | 'DiffStat'
  | 'ElapsedTime'
  | 'Calendar'
  | 'DateRangePicker'
  | 'PageHeader'
  | 'OrgSwitcher'
  | 'ListToolbar'
  | 'FilterBar'
  | 'MasterDetail'
  | 'SettingsSaveCancel'
  | 'UnsavedGuard'
  | 'MarketingHeader'
  | 'MarketingFooter'
  | 'MarketingHero'
  | 'MarketingFeatures'
  | 'MarketingPricing'
  | 'MarketingFAQ'
  | 'MarketingContact'
  | 'MarketingArticle'
  | 'Button'
  | 'IconButton'
  | 'Modal'
  | 'Sidecar'
  | 'SplitPane'
  | 'WorkspaceShell'
  | 'Field'
  | 'Input'
  | 'Textarea'
  | 'Checkbox'
  | 'Switch'
  | 'RadioGroup'
  | 'Slider'
  | 'Popover'
  | 'Tooltip'
  | 'AlertDialog'
  | 'DropdownMenu'
  | 'ContextMenu'
  | 'NavigationMenu'
  | 'Alert'
  | 'EmptyState'
  | 'Progress'
  | 'Toast'
  | 'Breadcrumb'
  | 'Pagination'
  | 'Sidebar'
  | 'Card'
  | 'Table'
  | 'Reasoning'
  | 'ChainOfThought'
  | 'Plan'
  | 'Checkpoint'
  | 'Sources'
  | 'ModelSelector'
  | 'FileDropzone'
  | 'Snippet'
  | 'Commit'
  | 'EnvironmentVariables'
  | 'PackageInfo'
  | 'SchemaDisplay'
  | 'StackTrace'
  | 'WebPreview'
  | 'AudioPlayer'
  | 'Transcription'
  | 'VoiceSelector'
  | 'Persona'
  | 'Image';
export interface CatalogEntry {
  name: VariantComponent | GenericComponent;
  category: string;
  group?: CatalogGroup;
  aliases?: readonly string[];
  presentations?: readonly string[];
  presentationProp?: 'variant' | 'layout' | 'presentation' | null;
  importPath?: string;
  relatedImports?: readonly string[];
  keyboard?: string;
  description: string;
  states: string[];
  contract: string;
  responsibility: string;
  code: string;
}
export const aliases: Record<string, string[]> = {
  PromptInput: ['AIComposer', 'Composer', 'PromptTextarea'],
  StreamingResponse: ['StreamingText'],
  Suggestions: ['FollowUpSuggestions'],
  ToolResult: ['ToolOutput'],
  ApprovalCard: ['Approval', 'ToolApproval'],
  SourceCard: ['Source', 'KnowledgeSource'],
  GroundingStatus: ['Grounding', 'GroundingBadge'],
  MCPServerCard: ['MCPServer', 'MCPConnection'],
  StatusBadge: ['AgentStatus', 'ToolStatus', 'ModelStatus'],
};
export const catalog: CatalogEntry[] = [
  ...genericCatalog,
  ...expandedCatalog,
  {
    name: 'ConnectionStatus',
    category: 'State & status',
    description:
      'Shows the connection state and offers the reconnect and replay actions supplied by the host.',
    states: [
      'Disconnected',
      'Connected',
      'Reconnecting',
      'Resumed',
      'Incompatible',
      'No replay',
      'Unknown outcome',
      'Connected stale',
      'Connected unknown',
      'Snapshot unavailable',
      'Error',
    ],
    contract: 'value: ConnectionInfo · submission? · onResume? · onRefresh?',
    responsibility:
      'Declare actual adapter capabilities and a public cursor. A recovery request is not a completed recovery or a new run.',
    code: '<ConnectionStatus value={connection} onResume={resume} onRefresh={refreshSnapshot} />',
  },
  {
    name: 'ModelControls',
    category: 'Model controls',
    description: 'Model capabilities, settings and usage, each showing where the value came from.',
    states: ['Default', 'Loading', 'Unavailable', 'Stale', 'Unsupported', 'Error', 'Usage unknown'],
    contract: 'capabilities · value: ModelSettings · onValueChange · status? · stale? · usage?',
    responsibility:
      'Discover capabilities on the host, persist the draft and validate settings/access at execution. Usage requires a named source and timestamp.',
    code: '<ModelControls capabilities={capabilities} value={settings} onValueChange={setSettings} usage={usage} />',
  },
  {
    name: 'ContextInspector',
    category: 'Context',
    description: 'Lists what a request selected, included, excluded or truncated.',
    states: ['Default', 'Stale', 'Unknown usage', 'Over limit', 'Empty', 'Loading', 'Error'],
    contract: 'value: ContextInspection · loading? · error? · onRefresh?',
    responsibility:
      'Provide a versioned context snapshot and honest measured/estimated token counts. Selection does not guarantee inclusion.',
    code: '<ContextInspector value={contextSnapshot} onRefresh={refreshContext} />',
  },
  {
    name: 'PolicyStatus',
    category: 'Enterprise AI',
    description: 'Attested policy results with their authority, time, scope and version.',
    states: ['Default', 'Passed', 'Blocked', 'Stale', 'Unknown', 'Loading', 'Empty', 'Error'],
    contract: 'checks: PolicyCheck[] · classification? · loading? · error? · onRefresh?',
    responsibility:
      'The authority supplies and refreshes attestation freshness. Missing metadata never becomes a passed policy check; the UI does not authorize actions.',
    code: '<PolicyStatus checks={policyChecks} classification="Confidential" onRefresh={refreshChecks} />',
  },
  {
    name: 'Select',
    category: 'Shared controls',
    description: 'A dropdown with keyboard navigation and a themed menu portal.',
    states: ['Default', 'Disabled', 'Long labels'],
    contract: 'value · onValueChange · options · disabled?',
    responsibility: 'Provide an accessible label and disabled options for unavailable choices.',
    code: '<Select value={environment} onValueChange={setEnvironment} options={environments} aria-label="Environment" />',
  },
  {
    name: 'Accordion',
    category: 'Shared controls',
    description: 'Collapsible sections with consistent focus handling and icon controls.',
    states: ['Default', 'Single', 'Long labels'],
    contract: 'items · type · value? · onValueChange? · headingLevel?',
    responsibility: 'Keep decision-critical information visible outside collapsed sections.',
    code: '<Accordion type="multiple" items={sections} />',
  },
  {
    name: 'Tabs',
    category: 'Shared controls',
    description: 'Switch between related views with a controlled selection.',
    states: ['Default', 'Long labels'],
    contract: 'value · onValueChange · items · label',
    responsibility:
      'Provide stable item IDs and descriptive labels. Tabs use automatic activation.',
    code: '<Tabs value={tab} onValueChange={setTab} items={views} label="Report views" />',
  },
  {
    name: 'LoadingIndicator',
    category: 'State & status',
    description: 'An activity indicator that never shows invented progress.',
    states: ['Default', 'Small', 'Large', 'Long labels'],
    contract: 'variant · label · size',
    responsibility: 'Render while the host operation is pending. This is indeterminate activity.',
    code: '<LoadingIndicator label="Searching sources" />',
  },
  {
    name: 'Skeleton',
    category: 'State & status',
    description: 'Placeholders that hold space while real content loads.',
    states: ['Default', 'Card', 'Avatar'],
    contract: 'variant · label · lines · shape',
    responsibility: 'Replace placeholders when data arrives; retain an accessible loading label.',
    code: '<Skeleton label="Loading answer" lines={3} />',
  },
  {
    name: 'PromptInput',
    category: 'Conversation',
    description: 'A composer for sending a prompt, with attachments, a toolbar and a cancel path.',
    states: [
      'Default',
      'Busy',
      'Disabled',
      'Attachments',
      'Toolbar',
      'Long toolbar',
      'Send unavailable',
      'Too long',
    ],
    contract:
      'value · onValueChange · onSubmit · busy · onCancel · attachments? · toolbar? · submitDisabled? · allowEmptySubmit?',
    responsibility: 'The host accepts the prompt and confirms cancellation.',
    code: '<PromptInput value={draft} onValueChange={setDraft} onSubmit={send} />',
  },
  {
    name: 'Message',
    category: 'Conversation',
    description: 'One user, assistant or system message with its parts and references.',
    states: [
      'Default',
      'Streaming',
      'Interrupted',
      'Markdown',
      'Code',
      'Table',
      'Footnotes',
      'Long code',
      'Unsafe content',
      'Live stream',
      ...partStates,
    ],
    contract:
      'value: MessageData · sources? · tools? · attachments? · renderTextPart? · renderContent? · children',
    responsibility: 'Provide stable message identity, role and revision.',
    code: '<Message value={message} />',
  },
  {
    name: 'MessageActions',
    category: 'Conversation',
    description: 'Copy, retry, edit and feedback actions for a message, with explicit results.',
    states: ['Default'],
    contract: 'text · onRetry? · onEdit? · onFeedback?',
    responsibility: 'Only provide actions supported by your host.',
    code: '<MessageActions text={message.text} onRetry={retry} />',
  },
  {
    name: 'StreamingResponse',
    category: 'Conversation',
    description: 'Renders an answer as it streams and marks interrupted or failed states.',
    states: [
      'Live stream',
      'Streaming',
      'Default',
      'Waiting',
      'Interrupted',
      'Markdown',
      'Code',
      'Table',
      'Incomplete Markdown',
      'Unsafe content',
      'Footnotes',
      'Long code',
      'Large content',
      'Long labels',
    ],
    contract: 'text · state · error? · renderContent?; optional MarkdownResponse from /markdown',
    responsibility:
      'The base entry renders plain text. Opt into the Markdown subpath for bounded GFM and incomplete-stream formatting. The host owns message state and link trust.',
    code: '<StreamingResponse text={text} state="streaming" />',
  },
  {
    name: 'Suggestions',
    category: 'Conversation',
    description: 'Follow-up prompts the user can send with one click.',
    states: ['Default', 'Disabled'],
    contract: 'items · onSelect · mode: fill | send',
    responsibility: 'Choose whether selection fills a draft or submits.',
    code: '<Suggestions items={prompts} onSelect={setDraft} mode="fill" />',
  },
  {
    name: 'Attachment',
    category: 'Conversation',
    description: 'File attachments with measured upload progress and accessible media previews.',
    states: [
      'Default',
      'Selected',
      'Uploading',
      'Unknown progress',
      'Awaiting confirmation',
      'Unknown outcome',
      'Failed',
      'Removing',
      'Cancelled',
      'Removed',
      'Upload checkpoint',
      'Lost upload receipt',
      'Resume unsupported',
      'Resume unknown',
      'Stale upload',
      'Upload revoked',
      'Long filename',
      'Image',
      'Text',
      'Audio',
      'Video',
      'Revoked',
      'Expired',
      'Missing',
      'Broken preview',
      'Blocked URL',
      'Collection',
    ],
    contract:
      'name · state · mediaType? · sizeBytes? · progress? · access? · preview? · onRemove? · onRetry? · onOpen? · Root / Preview / Info / Actions / Progress',
    responsibility:
      'The host validates, authorizes, uploads and stores files; owns object URLs and confirms state changes. UI checks are not file-content validation.',
    code: '<Attachment name="brief.pdf" state="ready" onRemove={remove} />',
  },
  {
    name: 'FileDropzone',
    category: 'Conversation',
    presentations: ['default'],
    presentationProp: null,
    description:
      'A drop target for local files with a browse button and type, size and slot checks.',
    states: ['Default', 'Single file', 'Rejected', 'Disabled', 'Full'],
    contract:
      'onFilesSelected · onReject? · accept? · maxFileBytes? · remainingSlots? · multiple? · disabled? · label? · browseLabel? · hint?',
    responsibility:
      'Dropped or chosen files are local File objects. The host validates content, uploads, stores and owns any object URLs.',
    keyboard: 'Tab reaches the browse button; Enter or Space opens the file chooser.',
    code: '<FileDropzone accept="image/*,.pdf" maxFileBytes={5 * 1024 * 1024} onFilesSelected={add} />',
  },
  {
    name: 'AgentSteps',
    category: 'Execution',
    aliases: ['Workflow', 'Dependencies', 'Pipeline stages'],
    description:
      'The steps of a run in order, with their states, details and optional prerequisites.',
    states: ['Default', 'Failed', 'Dependencies', 'Empty'],
    contract: 'steps: Step[] · label? · dependencies? · selectedId? · onSelect?(id)',
    responsibility: 'Supply public summaries, not private model reasoning.',
    code: '<AgentSteps steps={run.steps} />',
  },
  {
    name: 'ExecutionTimeline',
    category: 'Execution',
    description: 'A timed record of what happened during a run.',
    states: ['Default', 'Empty'],
    contract: 'entries · filter · onFilterChange? · detail?',
    responsibility: 'Timestamps and durations come from the host.',
    code: '<ExecutionTimeline entries={events} />',
  },
  {
    name: 'RunBoard',
    category: 'Execution',
    importPath: '/conversation-flow',
    aliases: ['Run board', 'Agent runs', 'Task board'],
    description:
      'Runs across threads as a board, grouped by what they need, with host filters and actions.',
    states: ['Default', 'Stale heartbeat', 'Failed', 'Filtered', 'Empty'],
    contract:
      'runs: RunCard[] · filter? · onFilterChange? · selectedId? · onSelect? · onAction? · receipts? · staleAfterMs? · now? · label?',
    responsibility:
      'Lifecycle, timestamps and heartbeats come from the host. A running run with no recent heartbeat is marked, never guessed finished. Actions are requests until a receipt arrives.',
    keyboard:
      'Arrow keys move between cards and columns; Home and End jump within a column; Enter opens a run.',
    code: '<RunBoard runs={runs} now={clock} onAction={request} />',
  },
  {
    name: 'AttentionQueue',
    category: 'Execution',
    importPath: '/conversation-flow',
    aliases: ['Agent inbox', 'Needs attention'],
    description:
      'The ordered list of approvals, questions, handoffs and failures waiting on a person.',
    states: ['Default', 'Unknown count', 'Empty'],
    contract: 'items: AttentionItem[] · count? · onOpen · onDismiss? · label?',
    responsibility:
      'Rows only; opening an item mounts its own decision control. The count is host-supplied and shows as unavailable when unknown.',
    keyboard: 'Arrow keys move between items; Enter opens; Dismiss is a separate button.',
    code: '<AttentionQueue items={items} count={count} onOpen={open} />',
  },
  {
    name: 'RunSummaryCard',
    category: 'Execution',
    importPath: '/conversation-flow',
    aliases: ['Run summary', 'Run report'],
    description:
      'What a run did, read afterwards: goal, outcome, effects with receipts, and what was left undone.',
    states: ['Succeeded', 'Partial', 'Failed', 'Unknown outcome'],
    contract: 'summary: RunSummary · receipts? · onOpenEffect? · actions?',
    responsibility:
      'An effect is confirmed only by an acknowledged receipt. Unknown outcomes are stated, not hidden. Duration and cost carry their meaning.',
    code: '<RunSummaryCard summary={summary} receipts={receipts} />',
  },
  {
    name: 'BackgroundStatus',
    category: 'Execution',
    importPath: '/conversation-flow',
    aliases: ['Background runs', 'Run indicator'],
    description: 'A small persistent indicator for runs still going while the person is elsewhere.',
    states: ['Running', 'Waiting', 'Stale', 'Idle'],
    contract: 'running · waiting · lastHeartbeatAt? · staleAfterMs? · now? · onOpen?',
    responsibility:
      'The host updates the counts; the indicator never polls. A silent host shows as no recent update.',
    code: '<BackgroundStatus running={running} waiting={waiting} onOpen={openBoard} />',
  },
  {
    name: 'RunCompare',
    category: 'Execution',
    importPath: '/conversation-flow',
    aliases: ['Compare runs', 'Attempt comparison'],
    description:
      'Two runs or checkpoints side by side: outcome, measurements, effects and timelines.',
    states: ['Default', 'Only differences', 'With timelines', 'Identical'],
    contract:
      'left · right: { label, summary, timeline?, receipts? } · onlyDifferences? · onOnlyDifferencesChange? · artifacts?',
    responsibility:
      "Rows compare host data only. An effect is confirmed on a side only by that side's acknowledged receipt. Artifact comparison is supplied by the host.",
    code: '<RunCompare left={{ label: "Attempt 1", summary: a }} right={{ label: "Attempt 2", summary: b }} />',
  },
  {
    name: 'SubagentTree',
    category: 'Execution',
    importPath: '/conversation-flow',
    aliases: ['Agent tree', 'Fleet view', 'Child runs'],
    description: 'Parent and child runs as a tree with the message that spawned each child.',
    states: ['Default', 'Stale child', 'Depth limit', 'More to load'],
    contract:
      'root: RunNode · selectedId? · onSelect? · onLoadMore? · maxDepth? · expandedIds? · onExpandedChange? · now?',
    responsibility:
      'The host sends the tree and any missing children on request. Depth is bounded; deeper runs are counted and loaded through the host.',
    keyboard:
      'Arrow keys move and expand or collapse; Home and End jump; typing a letter jumps to the next matching run; Enter selects.',
    code: '<SubagentTree root={tree} onSelect={open} onLoadMore={load} />',
  },
  {
    name: 'ToolCall',
    category: 'Tools',
    description: 'A tool request with its input, result, failure and duration.',
    presentations: ['row', 'card', 'terminal', 'compact'],
    states: [
      'Default',
      'Running',
      'Failed',
      'Unknown',
      'Queued',
      'Receiving input',
      'Needs approval',
      'Cancelled',
      'Denied',
      'No output',
      'Failed without details',
    ],
    contract: 'value: ToolCallData · Root / Summary / Input / Result · detail?',
    responsibility: 'The host executes tools and reports authoritative outcomes.',
    code: '<ToolCall value={toolCall} />',
  },
  {
    name: 'ToolResult',
    category: 'Tools',
    description: 'Bounded tool output with a safe fallback for unsupported content.',
    states: ['Default', 'Failed', 'Empty', 'Partial', 'Host renderer'],
    contract:
      'text? · result? · partial? · error? · maxCharacters? · onRetry? · ToolResultRegistryProvider',
    responsibility:
      'Redact secrets before passing content to any UI. Renderers are host code chosen by the host match function; partial counts are host measurements.',
    code: '<ToolResult text={output} error={error} onRetry={retry} />',
  },
  {
    name: 'ToolGroup',
    category: 'Tools',
    description: 'Several tool calls grouped together, keeping each failure visible.',
    presentations: ['list', 'stack', 'grid', 'accordion'],
    states: ['Default', 'Failed', 'Empty'],
    contract: 'tools: ToolCallData[] · detail?',
    responsibility: 'A group summary does not erase a failed call.',
    code: '<ToolGroup tools={calls} />',
  },
  {
    name: 'ApprovalCard',
    category: 'Human review',
    description: 'A review card for approving or rejecting a proposed action.',
    states: ['Default', 'Pending', 'Expired', 'Changed', 'Unknown'],
    contract: 'proposal · submission · stale? · expired? · onDecision · onReconcile?',
    responsibility:
      'Authenticate, recheck scope/version/expiry, deduplicate and execute on the server.',
    code: '<ApprovalCard proposal={proposal} submission={submission} onDecision={decide} />',
  },
  {
    name: 'PermissionRequest',
    category: 'Human review',
    description: 'A request for specific access, with its scope and version shown.',
    states: [
      'Default',
      'Pending',
      'Granted',
      'Denied',
      'Revoked',
      'Missing scope',
      'Missing resource',
      'Expired',
      'Stale',
      'Unknown outcome',
      'Scope changed',
    ],
    contract: 'value: PermissionSnapshot · commandId · submission · onDecision · onReconcile?',
    responsibility:
      'Authorize the current exact scope on the host, retain the original command and acknowledge its receipt. Permission grants remain separate from action approvals; reconnecting must not replay a decision.',
    code: '<PermissionRequest value={request} commandId={commandId} submission={submission} onDecision={sendDecision} onReconcile={lookupOriginal} />',
  },
  {
    name: 'ScopeGrant',
    category: 'Human review',
    importPath: '/conversation-flow',
    aliases: ['Standing permission', 'Grants', 'Session allow'],
    description:
      'Standing permissions with their scope, expiry, use count and a host-acknowledged revoke.',
    states: ['Default', 'Empty'],
    contract: 'grants: ScopeGrant[] · onRevoke? · receipts? · now? · label?',
    responsibility:
      'Grants are host records. Expiry is derived from the host clock; revoking is a request until the receipt arrives.',
    code: '<ScopeGrantList grants={grants} now={clock} onRevoke={revoke} />',
  },
  {
    name: 'DryRunPreview',
    category: 'Human review',
    importPath: '/conversation-flow',
    aliases: ['Dry run', 'Plan preview', 'Effects preview'],
    description:
      "The agent's declared effects before anything runs, with a veto per line and one versioned decision.",
    states: ['Default', 'Some skipped', 'Sending', 'Acknowledged', 'Plan changed'],
    contract:
      'plan: DryRunPlan · skippedIds · onSkippedChange · onDecision · submission? · receipt? · stale?',
    responsibility:
      'Nothing runs in the interface. The decision carries the plan version and the skipped effects; the host re-plans and executes.',
    keyboard: 'Each effect is a checkbox; Run and Cancel are buttons.',
    code: '<DryRunPreview plan={plan} skippedIds={skipped} onSkippedChange={setSkipped} onDecision={decide} />',
  },
  {
    name: 'ApprovalBatch',
    category: 'Human review',
    importPath: '/conversation-flow',
    aliases: ['Batch approval', 'Approve all'],
    description:
      'Several same-scope proposals under one acknowledged decision, each one still opt-out-able.',
    states: ['Default', 'One superseded', 'Mixed scopes', 'Acknowledged'],
    contract:
      'proposals · excludedIds · onExcludedChange · onDecision · submission? · receipt? · now?',
    responsibility:
      'Only pending, unexpired, included proposals with one shared target and scope are covered; the decision names each by id, version and digest, and the receipt says which ones the host applied.',
    code: '<ApprovalBatch proposals={proposals} excludedIds={excluded} onExcludedChange={setExcluded} onDecision={decide} />',
  },
  {
    name: 'UsageMeter',
    category: 'State & status',
    aliases: ['CostMeter', 'ContextMeter', 'Token usage', 'Budget'],
    description:
      'Context or cost usage with the meaning of the number beside it; a percentage only when the host reported a limit.',
    states: ['Default', 'Near limit', 'No limit', 'Cost', 'Unknown'],
    contract:
      'label · value: Measurement<{ used, limit? }> · unit? · currency? · warnAt? · locale?',
    responsibility:
      'Measured, estimated and unknown read differently. Without a limit there is no percentage; an unknown measurement shows the host reason, never zero.',
    code: '<UsageMeter label="Context" value={measured({ used: 12400, limit: 32000 })} />',
  },
  {
    name: 'ProvenanceBadge',
    category: 'Sources & evidence',
    aliases: ['Origin', 'Signed content', 'Content provenance'],
    description:
      'Where content came from: model, tool, person or imported, and Signed only when the host verified a manifest.',
    states: ['Default', 'Signed', 'Tool', 'Person', 'Imported'],
    contract: 'origin · source? · manifest? ({ issuer, verifiedBy: host, at })',
    responsibility:
      'The badge never verifies anything. A manifest the host did not verify is reported as unverified.',
    code: '<ProvenanceBadge origin="tool" source="search_accounts" manifest={manifest} />',
  },
  {
    name: 'ConfidenceNote',
    category: 'Sources & evidence',
    aliases: ['Calibration', 'Confidence score', 'Eval score'],
    description:
      'A host-supplied calibration with its scope, method and date, or nothing at all. Never a bare number.',
    states: ['Default', 'Estimated', 'Unknown'],
    contract: 'score: Measurement<number> · scope · method · at? · locale?',
    responsibility:
      'Renders nothing for an unknown or out-of-range score so a page without a calibration makes no confidence claim.',
    code: '<ConfidenceNote score={measured(0.82)} scope="of claims matched a source" method="eval pass rate over 40 runs" />',
  },
  {
    name: 'FeedbackCapture',
    category: 'Conversation',
    aliases: ['Thumbs', 'Rating', 'Correction', 'Message feedback'],
    description:
      'Thumbs, reasons and a correction bound to one message revision or run attempt, settled by a host receipt.',
    states: ['Default', 'Not helpful', 'Sending', 'Acknowledged', 'Failed', 'Outcome unknown'],
    contract:
      'target · value: FeedbackDraft · onValueChange · onSubmit · reasons? · submission? · receipt? · maxLength?',
    responsibility:
      'The submission names the exact revision or attempt. The form locks while the host answers; failed and unknown outcomes keep the draft and say what to do.',
    keyboard:
      'Helpful and Not helpful are toggle buttons; reasons are checkboxes; Enter in the form sends.',
    code: '<FeedbackCapture target={{ messageId, revision }} value={draft} onValueChange={setDraft} onSubmit={send} submission={submission} receipt={receipt} />',
  },
  {
    name: 'Chat',
    category: 'Conversation',
    importPath: '/chat',
    aliases: [
      'Chat window',
      'Assistant panel',
      'Conversation',
      'Thread',
      'useLocalHost',
      'useAiSdkChat',
      'useChat',
      'AI SDK',
      'Vercel AI SDK',
    ],
    description:
      'A complete chat surface: transcript, streaming reply, tool cards, suggestions, stop, retry and composer, driven by a host or by controlled props.',
    states: ['Default', 'Empty', 'Mid conversation', 'Failed', 'AI SDK approval'],
    contract:
      'host: ChatHost · or messages · tools? · status · suggestions? · draft · onDraftChange · onSend · onCancel? · onRetry? · title? · starters? · toolbar? · attachments?',
    responsibility:
      'The host owns the conversation and answers send, cancel and retry; the surface keeps only the draft text. useLocalHost gives a simulated host for prototypes that never calls a model.',
    keyboard:
      'Enter sends and Shift+Enter adds a line; the transcript is a focusable log; suggestions and Retry are buttons.',
    code: 'const host = useLocalHost();\nreturn <Chat host={host} title="Assistant" />;',
  },
  {
    name: 'ClarificationRequest',
    category: 'AI forms',
    description: 'A question the assistant asks before it continues.',
    states: ['Default', 'Text', 'Pending', 'Error', 'Resolved', 'Cancelled'],
    contract: 'question · value · onValueChange · onSubmit · choices? · state?',
    responsibility: 'Validate the answer on the host and acknowledge receipt.',
    code: '<ClarificationRequest question="Which environment?" value={value} onValueChange={setValue} onSubmit={submit} />',
  },
  {
    name: 'AgentCard',
    category: 'Agents',
    description: 'The identity, capabilities and current activity of one agent.',
    states: ['Default', 'Idle', 'Failed', 'Long labels', 'Read-only'],
    contract: 'name · description · state · activity? · selected? · onSelect?',
    responsibility: 'Identity is separate from the lifecycle of a specific run.',
    code: '<AgentCard name="Research agent" description="Finds relevant sources" state="running" />',
  },
  {
    name: 'SourceCard',
    category: 'Sources & evidence',
    description: 'A source behind an answer, with its access state and excerpt.',
    states: ['Default', 'Revoked', 'Missing', 'Host open', 'Long labels'],
    contract: 'source: Source · onOpen?',
    responsibility: 'Enforce source access and supply stable versioned locators.',
    code: '<SourceCard source={source} onOpen={openSource} />',
  },
  {
    name: 'Citation',
    category: 'Sources & evidence',
    description: 'An inline reference that links a passage to its source.',
    states: ['Default', 'Revoked'],
    contract: 'source: Source · number',
    responsibility: 'The displayed number is not the source identity.',
    code: '<Citation source={source} number={1} />',
  },
  {
    name: 'EvidenceGroup',
    category: 'Sources & evidence',
    description: 'A claim with the sources that support it.',
    states: ['Default', 'Empty'],
    contract: 'sources · claim · relationships?',
    responsibility: 'Declare supporting, contradicting or related evidence honestly.',
    code: '<EvidenceGroup sources={sources} claim="Review accounts before archival" />',
  },
  {
    name: 'GroundingStatus',
    category: 'Sources & evidence',
    description: 'A grounding measure with its definition and limits.',
    states: ['Default', 'Unknown', 'Long labels'],
    contract: 'value: Grounding',
    responsibility: 'Source coverage is not calibrated answer confidence.',
    code: '<GroundingStatus value={{ kind: "coverage", supported: 3, total: 4, method: "Linked claims" }} />',
  },
  {
    name: 'MCPServerCard',
    category: 'MCP',
    description: 'The connection state of an MCP server as reported by the host.',
    states: ['Default', 'Disconnected', 'Unknown', 'Long labels', 'Pending', 'Authorization'],
    contract: 'name · status · toolCount? · onConnect? · onDisconnect?',
    responsibility: 'The host owns transport, credentials and connector permissions.',
    code: '<MCPServerCard name="CRM sandbox" status="connected" toolCount={3} />',
  },
  {
    name: 'MCPToolList',
    category: 'MCP',
    description: 'The tools an MCP server offers and the permissions they need.',
    states: ['Default'],
    contract: 'tools · query · onQueryChange',
    responsibility: 'Tool availability is host supplied; unknown is explicit.',
    code: '<MCPToolList tools={tools} query={query} onQueryChange={setQuery} />',
  },
  {
    name: 'MCPAppFrame',
    category: 'MCP',
    importPath: '/mcp-apps',
    aliases: ['MCP App', 'Tool view', 'App frame'],
    description:
      'A sandboxed frame for an MCP App view with the declared policy and a host-controlled bridge.',
    states: ['Default', 'Nothing granted', 'Fetching', 'Blocked', 'Failed', 'Not an app'],
    contract:
      'server · resource · state · reason? · toolInput? · toolResult? · hostCapabilities? · hostContext? · grantedPermissions? · allowForms? · maxHeight? · onRequest? · onNotification? · onClose? · fallback?',
    responsibility:
      'The host fetches the resource, decides whether the server may show views, declares what it honours and answers every request. The frame grants no permission and runs nothing outside the sandbox.',
    keyboard: 'Tab moves into the view and back out; the Close button is a normal button.',
    code: '<MCPAppFrame server={server} resource={resource} state="ready" onRequest={decide} />',
  },
  {
    name: 'ContextBar',
    category: 'Context',
    description: 'What the current request includes, with removable items.',
    states: ['Default', 'Unknown', 'Long labels', 'Read-only'],
    contract: 'items · usage? · onRemove?',
    responsibility: 'Connected, selected and included are distinct states.',
    code: '<ContextBar items={context} usage={usage} />',
  },
  {
    name: 'ArtifactPanel',
    category: 'Artifacts',
    description: 'A panel for generated documents and other artifacts.',
    states: ['Default', 'Loading', 'Empty', 'Failed'],
    contract: 'artifact · open · onOpenChange · loading? · error?',
    responsibility: 'The host resolves versions and content access.',
    code: '<ArtifactPanel artifact={artifact} open={open} onOpenChange={setOpen} />',
  },
  {
    name: 'ArtifactPreview',
    category: 'Artifacts',
    description: 'Read-only previews of documents and bounded tables.',
    states: ['Default', 'Table', 'Unsupported'],
    contract: 'artifact: Artifact · tableLabel?',
    responsibility: 'Only text and bounded JSON tables render in this alpha.',
    code: '<ArtifactPreview artifact={artifact} />',
  },
  {
    name: 'StatusBadge',
    category: 'State & status',
    description: 'A status label with a consistent icon and tone for each state.',
    states: ['Default', 'Unknown'],
    contract: 'state · label? · native span props',
    responsibility: 'Unrecognized states never become success.',
    code: '<StatusBadge state="running" />',
  },
];

const genericGroups: Partial<Record<CatalogEntry['name'], CatalogGroup>> = {
  Select: 'Forms',
  Tabs: 'Navigation',
  LoadingIndicator: 'Feedback',
  Skeleton: 'Feedback',
  StatusBadge: 'Feedback',
  Accordion: 'Data Display',
  MarkdownResponse: 'Rich Content',
  MarkdownCodeBlock: 'Rich Content',
  RichMarkdownResponse: 'Rich Content',
  MathFormula: 'Rich Content',
  MermaidDiagram: 'Rich Content',
};
export function catalogGroup(entry: CatalogEntry): CatalogGroup {
  return entry.group ?? genericGroups[entry.name] ?? 'AI Components';
}
export function catalogStyles(entry: CatalogEntry): readonly string[] {
  return entry.presentations ?? componentVariants[entry.name as VariantComponent];
}
export function filterCatalog(query: string, group = 'All components'): CatalogEntry[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return categories
    .flatMap((category) => catalog.filter((entry) => catalogGroup(entry) === category))
    .filter((entry) => {
      const text =
        `${entry.name} ${entry.description} ${entry.category} ${catalogGroup(entry)} ${(aliases[entry.name] ?? []).join(' ')} ${(entry.aliases ?? []).join(' ')}`.toLocaleLowerCase();
      return (
        (group === 'All components' || catalogGroup(entry) === group) &&
        terms.every((term) => text.includes(term))
      );
    });
}
