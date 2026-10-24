// From the theme entry, which has no client directive, so server routes read the real lists.
import { componentVariants } from '@stackunseen/ui/theme';
import type { VariantComponent } from '@stackunseen/ui/theme';
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
  | 'ChatLauncher'
  | 'SuggestTextarea'
  | 'WorkSummary'
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
      'Whether you’re connected, with the reconnect and catch-up actions your app supports.',
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
      'Only offer the recovery actions your connection really supports. Asking to reconnect isn’t the same as being reconnected, and it never starts a new run.',
    code: '<ConnectionStatus value={connection} onResume={resume} onRefresh={refreshSnapshot} />',
  },
  {
    name: 'ModelControls',
    category: 'Model controls',
    description: 'Model capabilities, settings and usage, each showing where the value came from.',
    states: ['Default', 'Loading', 'Unavailable', 'Stale', 'Unsupported', 'Error', 'Usage unknown'],
    contract: 'capabilities · value: ModelSettings · onValueChange · status? · stale? · usage?',
    responsibility:
      'Look up what each model supports on your server, save the draft settings, and check settings and access when the request runs. Usage numbers need a source and a time.',
    code: '<ModelControls capabilities={capabilities} value={settings} onValueChange={setSettings} usage={usage} />',
  },
  {
    name: 'ContextInspector',
    category: 'Context',
    description: 'Lists what a request selected, included, excluded or truncated.',
    states: ['Default', 'Stale', 'Unknown usage', 'Over limit', 'Empty', 'Loading', 'Error'],
    contract: 'value: ContextInspection · loading? · error? · onRefresh?',
    responsibility:
      'Pass a versioned snapshot of the context, and say whether token counts are measured or estimated. Picking an item doesn’t guarantee it was included.',
    code: '<ContextInspector value={contextSnapshot} onRefresh={refreshContext} />',
  },
  {
    name: 'PolicyStatus',
    category: 'Enterprise AI',
    description:
      'Policy check results, with who checked, when, what they covered and which version.',
    states: ['Default', 'Passed', 'Blocked', 'Stale', 'Unknown', 'Loading', 'Empty', 'Error'],
    contract: 'checks: PolicyCheck[] · classification? · loading? · error? · onRefresh?',
    responsibility:
      'The system that runs the checks supplies and refreshes the results. Missing details never count as a pass, and the component never authorizes anything.',
    code: '<PolicyStatus checks={policyChecks} classification="Confidential" onRefresh={refreshChecks} />',
  },
  {
    name: 'Select',
    category: 'Shared controls',
    description: 'A dropdown for picking one option, with full keyboard support.',
    states: ['Default', 'Disabled', 'Long labels'],
    contract: 'value · onValueChange · options · disabled?',
    responsibility: 'Give it a label, and mark choices that aren’t available as disabled.',
    code: '<Select value={environment} onValueChange={setEnvironment} options={environments} aria-label="Environment" />',
  },
  {
    name: 'Accordion',
    category: 'Shared controls',
    description: 'Sections people can open and close.',
    states: ['Default', 'Single', 'Long labels'],
    contract: 'items · type · value? · onValueChange? · headingLevel?',
    responsibility: 'Keep anything people need to make a decision outside the collapsed sections.',
    code: '<Accordion type="multiple" items={sections} />',
  },
  {
    name: 'Tabs',
    category: 'Shared controls',
    description: 'Switch between related views of the same thing.',
    states: ['Default', 'Long labels', 'Vertical'],
    contract: 'value · onValueChange · items · label · orientation?: horizontal | vertical',
    responsibility:
      'Give each tab a stable ID and a clear label. A tab opens as soon as it gets focus.',
    code: '<Tabs value={tab} onValueChange={setTab} items={views} label="Report views" />',
  },
  {
    name: 'LoadingIndicator',
    category: 'State & status',
    description:
      'Shows that something is happening, without pretending to know how far along it is.',
    states: ['Default', 'Small', 'Large', 'Long labels'],
    contract: 'variant · label · size',
    responsibility: 'Show it while the work is in progress. It never shows a percentage.',
    code: '<LoadingIndicator label="Searching sources" />',
  },
  {
    name: 'Skeleton',
    category: 'State & status',
    description: 'Placeholders that hold space while real content loads.',
    states: ['Default', 'Card', 'Avatar'],
    contract: 'variant · label · lines · shape',
    responsibility:
      'Swap the placeholders for real content when it arrives, and keep a loading label for screen readers.',
    code: '<Skeleton label="Loading answer" lines={3} />',
  },
  {
    name: 'PromptInput',
    category: 'Conversation',
    description:
      'The composer for sending a prompt, with attachments, a toolbar and a way to stop.',
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
    responsibility: 'Your server takes the prompt, and confirms when a stop has worked.',
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
    responsibility: 'Give each message a stable ID, its role and a revision number.',
    code: '<Message value={message} />',
  },
  {
    name: 'MessageActions',
    category: 'Conversation',
    description:
      'Copy, retry, edit and feedback buttons for a message, each showing whether it worked.',
    states: ['Default'],
    contract: 'text · onRetry? · onEdit? · onFeedback?',
    responsibility: 'Only show actions your app supports.',
    code: '<MessageActions text={message.text} onRetry={retry} />',
  },
  {
    name: 'StreamingResponse',
    category: 'Conversation',
    description: 'Shows an answer as it streams in, and says clearly if it was cut off or failed.',
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
      'The main entry shows plain text. Import the Markdown entry for formatted replies, including half-finished ones. Your app owns the message state and decides which links to trust.',
    code: '<StreamingResponse text={text} state="streaming" />',
  },
  {
    name: 'Suggestions',
    category: 'Conversation',
    description: 'Follow-up prompts the user can send with one click.',
    states: ['Default', 'Disabled'],
    contract: 'items · onSelect · mode: fill | send',
    responsibility: 'Choose whether picking a suggestion fills the composer or sends it.',
    code: '<Suggestions items={prompts} onSelect={setDraft} mode="fill" />',
  },
  {
    name: 'Attachment',
    category: 'Conversation',
    description: 'Files attached to a message, with real upload progress and previews.',
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
      'Your server checks, uploads and stores the files, and confirms each change. The checks in the browser don’t look inside a file.',
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
      'Dropped or chosen files stay in the browser as File objects. Your app checks what’s in them, uploads and stores them.',
    keyboard: 'Tab reaches the browse button; Enter or Space opens the file chooser.',
    code: '<FileDropzone accept="image/*,.pdf" maxFileBytes={5 * 1024 * 1024} onFilesSelected={add} />',
  },
  {
    name: 'AgentSteps',
    category: 'Execution',
    aliases: ['Workflow', 'Dependencies', 'Pipeline stages'],
    description:
      'The steps of a run in order, with where each one stands, its details and anything it depends on.',
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
    responsibility: 'Times and durations come from your server.',
    code: '<ExecutionTimeline entries={events} />',
  },
  {
    name: 'RunBoard',
    category: 'Execution',
    importPath: '/conversation-flow',
    aliases: ['Run board', 'Agent runs', 'Task board'],
    description: 'All your runs on one board, grouped by what they need, with filters and actions.',
    states: ['Default', 'Stale heartbeat', 'Failed', 'Filtered', 'Empty'],
    contract:
      'runs: RunCard[] · filter? · onFilterChange? · selectedId? · onSelect? · onAction? · receipts? · staleAfterMs? · now? · label? · renderCardTrailing?',
    responsibility:
      'Status, times and heartbeats come from your server. A run that has gone quiet is flagged, never assumed finished. An action counts as done only once your server confirms it.',
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
      'It lists items; opening one shows the right control to act on it. The count comes from your server and says so when it isn’t known.',
    keyboard: 'Arrow keys move between items; Enter opens; Dismiss is a separate button.',
    code: '<AttentionQueue items={items} count={count} onOpen={open} />',
  },
  {
    name: 'RunSummaryCard',
    category: 'Execution',
    importPath: '/conversation-flow',
    aliases: ['Run summary', 'Run report'],
    description:
      'What a run did, for reading afterwards: the goal, the outcome, what it changed and what was left undone.',
    states: ['Succeeded', 'Partial', 'Failed', 'Unknown outcome'],
    contract: 'summary: RunSummary · receipts? · onOpenEffect? · actions?',
    responsibility:
      'A change counts as done only when your server has confirmed it. Outcomes you don’t know are shown as unknown, not hidden. Time and cost say how they were measured.',
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
      'Your app updates the counts; the indicator never polls. If updates stop arriving, it says so.',
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
      "Rows compare server data only. An effect is confirmed on a side only by that side's acknowledged receipt. Artifact comparison is supplied by the server.",
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
      'Your app sends the tree and loads more children when asked. Very deep trees show a count and load the rest on request.',
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
    responsibility: 'Your server runs the tools and reports what actually happened.',
    code: '<ToolCall value={toolCall} />',
  },
  {
    name: 'ToolResult',
    category: 'Tools',
    description: 'Tool output, size-limited, with a safe fallback for content it can’t show.',
    states: ['Default', 'Failed', 'Empty', 'Partial', 'Host renderer'],
    contract:
      'text? · result? · partial? · error? · maxCharacters? · onRetry? · ToolResultRegistryProvider',
    responsibility:
      'Remove secrets before passing content to any UI. Custom renderers are your own code, picked by your match function, and partial counts come from your server.',
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
      'On your server: check who is asking, recheck the scope, version and expiry, ignore duplicates, then run the action.',
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
      'Authorize the exact scope on your server, keep the original request and confirm it back. Granting access is separate from approving an action, and reconnecting must never resend a decision.',
    code: '<PermissionRequest value={request} commandId={commandId} submission={submission} onDecision={sendDecision} onReconcile={lookupOriginal} />',
  },
  {
    name: 'ScopeGrant',
    category: 'Human review',
    importPath: '/conversation-flow',
    aliases: ['Standing permission', 'Grants', 'Session allow'],
    description:
      'Permissions that stay in place, with their scope, expiry, how often they were used, and a way to revoke them.',
    states: ['Default', 'Empty'],
    contract: 'grants: ScopeGrant[] · onRevoke? · receipts? · now? · label?',
    responsibility:
      'Grants live on your server, and expiry uses your server’s clock. A revoke counts as done once your server confirms it.',
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
      'Nothing runs in the browser. The decision says which plan version it covers and which changes to skip; your server re-plans and runs it.',
    keyboard: 'Each effect is a checkbox; Run and Cancel are buttons.',
    code: '<DryRunPreview plan={plan} skippedIds={skipped} onSkippedChange={setSkipped} onDecision={decide} />',
  },
  {
    name: 'ApprovalBatch',
    category: 'Human review',
    importPath: '/conversation-flow',
    aliases: ['Batch approval', 'Approve all'],
    description: 'Approve several similar proposals at once, and still leave any of them out.',
    states: ['Default', 'One superseded', 'Mixed scopes', 'Acknowledged'],
    contract:
      'proposals · excludedIds · onExcludedChange · onDecision · submission? · receipt? · now?',
    responsibility:
      'One decision covers only proposals that are pending, unexpired, included and share a target and scope. It names each one exactly, and your server’s reply says which ones it applied.',
    code: '<ApprovalBatch proposals={proposals} excludedIds={excluded} onExcludedChange={setExcluded} onDecision={decide} />',
  },
  {
    name: 'UsageMeter',
    category: 'State & status',
    aliases: ['CostMeter', 'ContextMeter', 'Token usage', 'Budget'],
    description:
      'How much context or money has been used, with what the number means. A percentage shows only when there’s a known limit.',
    states: ['Default', 'Near limit', 'No limit', 'Cost', 'Unknown'],
    contract:
      'label · value: Measurement<{ used, limit? }> · unit? · currency? · warnAt? · locale?',
    responsibility:
      'Measured, estimated and unknown numbers look different. Without a limit there’s no percentage, and an unknown amount shows the reason instead of zero.',
    code: '<UsageMeter label="Context" value={measured({ used: 12400, limit: 32000 })} />',
  },
  {
    name: 'ProvenanceBadge',
    category: 'Sources & evidence',
    aliases: ['Origin', 'Signed content', 'Content provenance'],
    description:
      'Where content came from (a model, a tool, a person or an import), marked Signed only when your server verified it.',
    states: ['Default', 'Signed', 'Tool', 'Person', 'Imported'],
    contract: 'origin · source? · manifest? ({ issuer, verifiedBy: host, at })',
    responsibility:
      'The badge itself never verifies anything; whatever your server didn’t verify shows as unverified.',
    code: '<ProvenanceBadge origin="tool" source="search_accounts" manifest={manifest} />',
  },
  {
    name: 'ConfidenceNote',
    category: 'Sources & evidence',
    aliases: ['Calibration', 'Confidence score', 'Eval score'],
    description:
      'A confidence score with what it covers, how it was worked out and when, or nothing at all. Never a bare number.',
    states: ['Default', 'Estimated', 'Unknown'],
    contract: 'score: Measurement<number> · scope · method · at? · locale?',
    responsibility:
      'Shows nothing for an unknown or invalid score, so a page never claims confidence it doesn’t have.',
    code: '<ConfidenceNote score={measured(0.82)} scope="of claims matched a source" method="eval pass rate over 40 runs" />',
  },
  {
    name: 'FeedbackCapture',
    category: 'Conversation',
    aliases: ['Thumbs', 'Rating', 'Correction', 'Message feedback'],
    description:
      'Thumbs up or down, reasons and a correction for one specific reply, saved once your server confirms.',
    states: ['Default', 'Not helpful', 'Sending', 'Acknowledged', 'Failed', 'Outcome unknown'],
    contract:
      'target · value: FeedbackDraft · onValueChange · onSubmit · reasons? · submission? · receipt? · maxLength?',
    responsibility:
      'Feedback names the exact version of the reply it’s about. The form waits while your server answers; if saving fails or the result is unclear, the draft stays and the form says what to do.',
    keyboard:
      'Helpful and Not helpful are toggle buttons; reasons are checkboxes; Enter in the form sends.',
    code: '<FeedbackCapture target={{ messageId, revision }} value={draft} onValueChange={setDraft} onSubmit={send} submission={submission} receipt={receipt} />',
  },
  {
    name: 'ChatLauncher',
    category: 'Conversation',
    importPath: '/chat',
    // One look; the placement is a prop, not a presentation.
    presentations: ['default'],
    aliases: ['Chat widget', 'Chat bubble', 'Support chat', 'Assistant popup'],
    description:
      'A floating chat bubble for a website that opens a chat panel, full screen on phones.',
    states: ['Closed', 'Open', 'Unread'],
    contract:
      'open · onOpenChange · title · children · label? · placement?: bottom-end | bottom-start · unread?',
    responsibility:
      'Put a Chat inside. The panel stays mounted while closed so the conversation and draft survive; count unread replies on your side.',
    keyboard:
      'The bubble reports aria-expanded. Opening focuses the composer; Escape or Close returns focus to the bubble. The panel is non-modal, so the page stays usable.',
    code: '<ChatLauncher open={open} onOpenChange={setOpen} title="Ask Acme"><Chat {...chat} /></ChatLauncher>',
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
      'A complete chat: messages, streaming replies, tool cards, suggestions, stop, retry and the composer. Connect it to your server or drive it with props.',
    states: ['Default', 'Empty', 'Mid conversation', 'Failed', 'AI SDK approval'],
    contract:
      'server: ChatHost · or messages · tools? · status · suggestions? · draft · onDraftChange · onSend · onCancel? · onRetry? · title? · starters? · toolbar? · attachments?',
    responsibility:
      'Your server owns the conversation and handles send, stop and retry; the chat only keeps the unsent draft. useLocalHost gives you a stand-in server for prototypes that never calls a model.',
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
    responsibility: 'Check the answer on your server and confirm you got it.',
    code: '<ClarificationRequest question="Which environment?" value={value} onValueChange={setValue} onSubmit={submit} />',
  },
  {
    name: 'AgentCard',
    category: 'Agents',
    description: 'The identity, capabilities and current activity of one agent.',
    states: ['Default', 'Idle', 'Failed', 'Long labels', 'Read-only'],
    contract: 'name · description · state · activity? · selected? · onSelect?',
    responsibility: 'Who the agent is stays separate from how any one run is going.',
    code: '<AgentCard name="Research agent" description="Finds relevant sources" state="running" />',
  },
  {
    name: 'SourceCard',
    category: 'Sources & evidence',
    description: 'A source behind an answer, with its access state and excerpt.',
    states: ['Default', 'Revoked', 'Missing', 'Host open', 'Long labels'],
    contract: 'source: Source · onOpen?',
    responsibility:
      'Check who may see each source, and give each one a stable link to the right version.',
    code: '<SourceCard source={source} onOpen={openSource} />',
  },
  {
    name: 'Citation',
    category: 'Sources & evidence',
    description: 'An inline reference that links a passage to its source.',
    states: ['Default', 'Revoked'],
    contract: 'source: Source · number',
    responsibility: 'The number shown is just a label, not the source’s ID.',
    code: '<Citation source={source} number={1} />',
  },
  {
    name: 'EvidenceGroup',
    category: 'Sources & evidence',
    description: 'A claim with the sources that support it.',
    states: ['Default', 'Empty'],
    contract: 'sources · claim · relationships?',
    responsibility:
      'Say honestly whether each source supports the claim, contradicts it or is only related.',
    code: '<EvidenceGroup sources={sources} claim="Review accounts before archival" />',
  },
  {
    name: 'GroundingStatus',
    category: 'Sources & evidence',
    description:
      'How well an answer is backed by sources, with what that measure means and its limits.',
    states: ['Default', 'Unknown', 'Long labels'],
    contract: 'value: Grounding',
    responsibility:
      'Being covered by sources isn’t the same as being confident the answer is right.',
    code: '<GroundingStatus value={{ kind: "coverage", supported: 3, total: 4, method: "Linked claims" }} />',
  },
  {
    name: 'MCPServerCard',
    category: 'MCP',
    description: 'Whether an MCP server is connected, as your app reports it.',
    states: ['Default', 'Disconnected', 'Unknown', 'Long labels', 'Pending', 'Authorization'],
    contract: 'name · status · toolCount? · onConnect? · onDisconnect?',
    responsibility: 'Your app owns the connection, the credentials and the permissions.',
    code: '<MCPServerCard name="CRM sandbox" status="connected" toolCount={3} />',
  },
  {
    name: 'MCPToolList',
    category: 'MCP',
    description: 'The tools an MCP server offers and the permissions they need.',
    states: ['Default'],
    contract: 'tools · query · onQueryChange',
    responsibility:
      'Your app says which tools are available; anything unknown is shown as unknown.',
    code: '<MCPToolList tools={tools} query={query} onQueryChange={setQuery} />',
  },
  {
    name: 'MCPAppFrame',
    category: 'MCP',
    importPath: '/mcp-apps',
    aliases: ['MCP App', 'Tool view', 'App frame'],
    description:
      'A sandboxed frame for an MCP App view, talking to your app only through a bridge you control.',
    states: ['Default', 'Nothing granted', 'Fetching', 'Blocked', 'Failed', 'Not an app'],
    contract:
      'server · resource · state · reason? · toolInput? · toolResult? · hostCapabilities? · hostContext? · grantedPermissions? · allowForms? · maxHeight? · onRequest? · onNotification? · onClose? · fallback?',
    responsibility:
      'Your app fetches the view, decides whether the server may show it, declares what it supports and answers every request. The frame grants no permissions and runs nothing outside its sandbox.',
    keyboard: 'Tab moves into the view and back out; the Close button is a normal button.',
    code: '<MCPAppFrame server={server} resource={resource} state="ready" onRequest={decide} />',
  },
  {
    name: 'ContextBar',
    category: 'Context',
    description: 'What the current request includes, with removable items.',
    states: ['Default', 'Unknown', 'Long labels', 'Read-only'],
    contract: 'items · usage? · onRemove?',
    responsibility: 'Connected, selected and actually included are shown as different things.',
    code: '<ContextBar items={context} usage={usage} />',
  },
  {
    name: 'ArtifactPanel',
    category: 'Artifacts',
    description: 'A panel for generated documents and other artifacts.',
    states: ['Default', 'Loading', 'Empty', 'Failed'],
    contract: 'artifact · open · onOpenChange · loading? · error?',
    responsibility: 'Your app picks the version to show and checks who may see it.',
    code: '<ArtifactPanel artifact={artifact} open={open} onOpenChange={setOpen} />',
  },
  {
    name: 'ArtifactPreview',
    category: 'Artifacts',
    description: 'Read-only previews of documents and bounded tables.',
    states: ['Default', 'Table', 'Unsupported'],
    contract: 'artifact: Artifact · tableLabel?',
    responsibility: 'In this alpha, only text and small JSON tables are shown.',
    code: '<ArtifactPreview artifact={artifact} />',
  },
  {
    name: 'StatusBadge',
    category: 'State & status',
    description: 'A status label with a matching icon and color.',
    states: ['Default', 'Unknown'],
    contract: 'state · label? · native span props',
    responsibility: 'A status it doesn’t recognize is never shown as success.',
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
