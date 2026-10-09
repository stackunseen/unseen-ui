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
  | 'LinkButton'
  | 'SegmentedControl'
  | 'Chip'
  | 'Stepper'
  | 'Disclosure'
  | 'Matrix'
  | 'Kbd'
  | 'SkipLink'
  | 'VisuallyHidden'
  | 'Tag'
  | 'Avatar'
  | 'Stat'
  | 'MultiSelect'
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
  | 'Panel'
  | 'PanelHeader'
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
  | 'Task'
  | 'Checkpoint'
  | 'Shimmer'
  | 'Sources'
  | 'ModelSelector'
  | 'OpenInChat'
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
      'Waiting',
      'Streaming',
      'Default',
      'Interrupted',
      'Markdown',
      'Code',
      'Table',
      'Incomplete Markdown',
      'Unsafe content',
      'Footnotes',
      'Long code',
      'Large content',
      'Live stream',
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
    name: 'AgentSteps',
    category: 'Execution',
    description: 'The steps of a run in order, with their states and details.',
    states: ['Default', 'Failed', 'Empty'],
    contract: 'steps: Step[] · label?',
    responsibility: 'Supply public summaries, not private model reasoning.',
    code: '<AgentSteps steps={run.steps} />',
  },
  {
    name: 'ExecutionTimeline',
    category: 'Execution',
    description: 'A timed record of what happened during a run.',
    states: ['Default', 'Empty'],
    contract: 'entries · filter · onFilterChange?',
    responsibility: 'Timestamps and durations come from the host.',
    code: '<ExecutionTimeline entries={events} />',
  },
  {
    name: 'ToolCall',
    category: 'Tools',
    description: 'A tool request with its input, result, failure and duration.',
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
    contract: 'value: ToolCallData · Root / Summary / Input / Result',
    responsibility: 'The host executes tools and reports authoritative outcomes.',
    code: '<ToolCall value={toolCall} />',
  },
  {
    name: 'ToolResult',
    category: 'Tools',
    description: 'Bounded tool output with a safe fallback for unsupported content.',
    states: ['Default', 'Failed', 'Empty'],
    contract: 'text? · error? · maxCharacters? · onRetry?',
    responsibility: 'Redact secrets before passing content to any UI.',
    code: '<ToolResult text={output} error={error} onRetry={retry} />',
  },
  {
    name: 'ToolGroup',
    category: 'Tools',
    description: 'Several tool calls grouped together, keeping each failure visible.',
    states: ['Default', 'Failed', 'Empty'],
    contract: 'tools: ToolCallData[]',
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
  {
    name: 'Workflow',
    category: 'Workflow',
    description: 'The stages of a workflow and the dependencies between them.',
    states: ['Default', 'Failed', 'Empty'],
    contract: 'steps · selectedId? · onSelect?',
    responsibility: 'A read-only execution view; the host schedules the work.',
    code: '<Workflow steps={steps} selectedId={selected} onSelect={setSelected} />',
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
