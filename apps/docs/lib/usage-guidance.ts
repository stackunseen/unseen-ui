/**
 * When to reach for a component, when not to, and what to use instead. One entry per released
 * component; `instead` names catalog components only (checked by a test).
 */
export interface UsageGuidance {
  use: string;
  avoid: string;
  instead: readonly string[];
}

const g = (use: string, avoid: string, ...instead: string[]): UsageGuidance => ({
  use,
  avoid,
  instead,
});

export const usageGuidance: Record<string, UsageGuidance> = {
  // Actions
  Button: g(
    'An action: save, submit, open, run; or, with href, a call to action that navigates.',
    'Text links inside sentences.',
    'IconButton',
    'Card',
  ),
  IconButton: g(
    'A frequent action where the icon is universally understood and space is tight, such as close or copy.',
    'Primary or unfamiliar actions; a visible label is clearer.',
    'Button',
  ),
  CopyButton: g(
    'Copying a value such as a command, id or link, with the real outcome reported.',
    'Copying whole messages with other actions beside it.',
    'MessageActions',
    'Snippet',
  ),
  Chip: g(
    'Removable selections or tag links in a row.',
    'Choosing between options; that is a ToggleGroup.',
    'ToggleGroup',
    'Tag',
  ),
  ToggleGroup: g(
    'Choosing one or several options shown at once: filter pills with counts, or joined segments (variant="segmented"), as buttons or URL links.',
    'Switching between panels of content.',
    'Tabs',
    'Select',
  ),
  AppearanceToggle: g(
    'Letting people choose light, dark or system appearance.',
    'Other settings; it is wired to the theme provider.',
    'ToggleGroup',
    'Switch',
  ),
  // Forms
  Field: g(
    'Wrapping any form control with its label, description and validation message.',
    'Controls without a visible label, such as a search bar in a toolbar.',
    'InputGroup',
  ),
  Input: g(
    'A single line of free text, inside a Field.',
    'Long text or a value chosen from a list.',
    'Textarea',
    'Select',
    'Combobox',
  ),
  Textarea: g(
    'Multiline free text such as descriptions or notes.',
    'Prompts to an assistant; the composer handles submit and cancel.',
    'PromptInput',
    'Input',
  ),
  Checkbox: g(
    'An independent yes or no, or several items picked from a short list.',
    'A setting that takes effect immediately.',
    'Switch',
    'RadioGroup',
  ),
  Switch: g(
    'A setting that applies as soon as it is flipped.',
    'Choices that only apply when a form is submitted.',
    'Checkbox',
  ),
  RadioGroup: g(
    'One choice from a short list where every option should stay visible.',
    'More than about seven options.',
    'Select',
    'ToggleGroup',
  ),
  TonePad: g(
    'Two linked settings on one square, such as tone and length.',
    'One number, or exact values people type.',
    'Slider',
    'Input',
  ),
  Slider: g(
    'Picking a number in a range where the exact value matters less than the position.',
    'Precise values people type.',
    'Input',
  ),
  Select: g(
    'One choice from a known list of up to a few dozen items.',
    'Long or searchable lists, or several choices.',
    'Combobox',
    'RadioGroup',
  ),
  Combobox: g(
    'One choice, or several with type="multiple", from a long list people search, including results loaded from your server.',
    'Short lists where scanning is faster than typing.',
    'Select',
    'ToggleGroup',
  ),
  Calendar: g(
    'Picking a date or range inline, with availability rules.',
    'A compact field in a form.',
    'DateRangePicker',
  ),
  DateRangePicker: g(
    'A date range inside a form or filter bar.',
    'A large always-visible calendar.',
    'Calendar',
  ),
  InputGroup: g(
    'An input with an attached action or affix, such as a search with a button or an amount with a currency.',
    'Separate controls that only happen to sit together.',
    'Field',
  ),
  // Overlays and navigation
  Popover: g(
    'Interactive content anchored to a trigger, such as a small form or filter.',
    'Short descriptions without controls, or focused tasks.',
    'Tooltip',
    'Modal',
  ),
  Tooltip: g(
    'A short label for an icon or truncated text, on hover and focus.',
    'Anything interactive or essential; touch users may never see it.',
    'Popover',
  ),
  AlertDialog: g(
    'Confirming a destructive or irreversible action before it happens.',
    'Agent actions that need a reviewed proposal and your server’s confirmation.',
    'ApprovalCard',
    'Modal',
  ),
  Modal: g(
    'A focused task that blocks the page until done or dismissed.',
    'Information people need while still using the page.',
    'Sidecar',
    'Popover',
  ),
  DropdownMenu: g(
    'A list of actions behind one button.',
    'Choosing a value for a form.',
    'Select',
    'ContextMenu',
  ),
  ContextMenu: g(
    'Actions on an item from right-click or the menu key.',
    'The only way to reach an action; offer it visibly too.',
    'DropdownMenu',
  ),
  NavigationMenu: g(
    'Top-level site navigation with grouped destinations.',
    'In-app sections of one page.',
    'Tabs',
    'Sidebar',
  ),
  Breadcrumb: g(
    'Showing where a page sits in a hierarchy, with links back up.',
    'Steps of a process.',
    'Stepper',
  ),
  Pagination: g(
    'Moving through pages of results, including unknown totals.',
    'Content the reader scrolls continuously.',
    'DataGrid',
  ),
  Sidebar: g(
    'Persistent app navigation with groups and the current page.',
    'Detail about a selected item.',
    'Sidecar',
  ),
  Tabs: g(
    'Switching between related views of one subject.',
    'Navigating to different pages, or filtering one list.',
    'NavigationMenu',
    'ToggleGroup',
  ),
  Stepper: g(
    'Showing position in a multi-step flow.',
    'A hierarchy of pages.',
    'Breadcrumb',
    'Progress',
  ),
  CommandPalette: g(
    'A Ctrl/Cmd+K jump-anywhere search for frequent users.',
    'The only way to reach pages.',
    'Sidebar',
    'NavigationMenu',
  ),
  TableOfContents: g(
    'An "On this page" rail for long documents.',
    'Short pages with two or three sections.',
    'Tabs',
  ),
  ShareMenu: g(
    'Sharing a page or opening a query in another chat: copy link, native share sheet and chosen targets.',
    'Copying a single value.',
    'CopyButton',
  ),
  // Feedback
  Alert: g(
    'A persistent message about the page or form, with a tone and an action.',
    'Brief confirmations that should go away.',
    'Toast',
    'EmptyState',
  ),
  Toast: g(
    'A brief confirmation of something that happened, with an undo or retry.',
    'Errors people must act on.',
    'Alert',
  ),
  EmptyState: g(
    'Explaining why there is nothing here and what to do next.',
    'Errors or loading.',
    'Alert',
    'Skeleton',
  ),
  Progress: g(
    'A measured amount of work done, or an explicitly unknown total; variant="ring" for small square spaces.',
    'Activity without a measure.',
    'LoadingIndicator',
  ),
  LoadingIndicator: g(
    'Showing that something is happening without inventing progress.',
    'Holding the space of content that is loading.',
    'Skeleton',
    'Progress',
  ),
  Skeleton: g(
    'Holding the space of content while it loads, to avoid layout jumps.',
    'Background work unrelated to visible content.',
    'LoadingIndicator',
  ),
  StatusBadge: g(
    'A run, tool or task state with its icon and tone.',
    'Categories without state.',
    'Tag',
  ),
  // Data display
  Card: g(
    'A box with a heading, actions, body and footer, or a whole-card link with href.',
    'Interactive controls inside a linked card.',
    'Accordion',
    'Table',
  ),
  Table: g(
    'Read-only tabular data with native semantics.',
    'Sorting, paging and selection.',
    'DataGrid',
  ),
  DataGrid: g(
    'Large tables with controlled sorting, paging, selection and column visibility.',
    'A few read-only rows.',
    'Table',
  ),
  Tag: g('A category or level label.', 'Run or task state.', 'StatusBadge', 'Chip'),
  DiffStat: g(
    'Lines added and removed beside a task, commit or pull request.',
    'The changes themselves.',
    'CodeDiff',
  ),
  ElapsedTime: g(
    'How long a run or turn has taken, live while it runs.',
    'A date or a schedule.',
    'StatusBadge',
  ),
  Numeric: g(
    'One figure with what it means beside it: a duration, a count, a delta.',
    'A labelled metric in a row of metrics.',
    'Stat',
  ),
  Kbd: g('A key cap in a hint or a menu row.', 'The action itself.', 'Button'),
  DotRing: g(
    'Counts around a cycle: hours of a day, steps of a loop.',
    'Progress toward one total.',
    'Progress',
  ),
  DotBars: g(
    'Daily or per-step counts with a range to call out.',
    'Real axes, several series or negative values.',
    'Chart',
  ),
  WeekStrip: g(
    'A week of counts, stacked by kind, with a goal.',
    'More than a couple of weeks.',
    'Chart',
  ),
  HeatKeys: g(
    'Which keys or cells get used, laid out like the real thing.',
    'Counts across two named axes.',
    'Matrix',
  ),
  Sparkline: g(
    'A trend beside a number, in a stat card or a table cell.',
    'Reading exact values off an axis.',
    'Chart',
  ),
  BarList: g(
    'Ranked totals: tokens by tool, spend by agent, calls by model.',
    'Values over time.',
    'Chart',
  ),
  Tracker: g(
    'How each day or run went, for uptime, nightly evals or a run history.',
    'Counts that need a scale.',
    'DotBars',
  ),
  DonutChart: g(
    'A few shares of one total, such as spend by model.',
    'More than five or six parts, or values that do not add up to a whole.',
    'BarList',
  ),
  Avatar: g('A person or team, with an image or initials.', 'Voice agent presence.', 'Persona'),
  Stat: g(
    'A key number with its label and change, in a row of metrics.',
    'Trends over time.',
    'Chart',
  ),
  Accordion: g(
    'Collapsible sections, including a single one people can expand.',
    'Content people need to compare side by side.',
    'Tabs',
  ),
  Matrix: g(
    'Counts across two dimensions as a heatmap table with links.',
    'Continuous values over time.',
    'Chart',
  ),
  // Layout
  Sidecar: g(
    'An inspector or drawer beside content, becoming a sheet on small screens.',
    'Blocking tasks.',
    'Modal',
  ),
  SplitPane: g(
    'Two resizable panes, such as code and preview.',
    'Fixed layouts that never resize.',
    'WorkspaceShell',
  ),
  WorkspaceShell: g(
    'A full app frame with header, navigation, content, inspector and footer.',
    'Single content pages.',
    'SplitPane',
  ),
  // Conversation
  Chat: g(
    'A complete chat you can connect to your server, the AI SDK or your own state.',
    'Custom layouts that need the pieces arranged differently.',
    'PromptInput',
    'Message',
    'StreamingResponse',
  ),
  PromptInput: g(
    'The composer for prompts, with attachments, toolbar, submit and cancel.',
    'Plain form fields.',
    'Textarea',
    'Chat',
  ),
  Message: g(
    'One message with its ordered parts, sources, tools and attachments.',
    'A whole conversation surface.',
    'Chat',
  ),
  MessageActions: g(
    'Copy, retry, edit and quick feedback on a reply.',
    'Feedback with reasons and corrections.',
    'FeedbackCapture',
  ),
  StreamingResponse: g(
    'Rendering a reply as it streams, with interrupted and failed states.',
    'Formatted Markdown replies.',
    'MarkdownResponse',
  ),
  FollowUps: g(
    'Short next steps after an answer, such as Shorter or More formal.',
    'Fresh prompts to start a new question.',
    'Suggestions',
  ),
  Suggestions: g(
    'Follow-up prompts sent or filled with one click.',
    'Choices the assistant needs answered to continue.',
    'ClarificationRequest',
  ),
  Attachment: g(
    'Files attached to a message, with measured upload progress.',
    'Picking files.',
    'FileDropzone',
  ),
  AttachmentTray: g(
    'Several files in the composer, each with its own progress, retry and remove.',
    'One file with a large preview.',
    'Attachment',
    'PromptInput',
  ),
  ShortcutHelp: g(
    'A list of the keyboard shortcuts this page actually handles.',
    'A command menu for jumping to pages.',
    'CommandPalette',
    'Kbd',
  ),
  FileDropzone: g(
    'Picking local files by drop or browse, with type, size and slot checks.',
    'Showing files already attached.',
    'Attachment',
  ),
  ChatLauncher: g(
    'A chat a visitor opens from a corner of your website.',
    'The main screen of a chat app.',
    'Chat',
  ),
  SuggestTextarea: g(
    'Writing where an AI suggests how the sentence continues.',
    'A chat composer that sends on Enter.',
    'PromptInput',
    'Textarea',
  ),
  WorkSummary: g(
    'The steps of one agent turn, collapsed to how long it took once done.',
    'Reasoning text, or runs across many threads.',
    'Reasoning',
    'RunBoard',
  ),
  Reasoning: g(
    'A collapsible public summary of how the reply was reached.',
    'Private chain of thought; do not show it.',
    'ChainOfThought',
  ),
  Checkpoint: g(
    'Marking a point in a conversation people can restore.',
    'Branch navigation.',
    'BranchSwitcher',
  ),
  SlashCommandMenu: g(
    'Running your app’s commands from the composer with "/".',
    'Referencing files or people.',
    'MentionPicker',
  ),
  ThreadList: g(
    'Searching, selecting, renaming and archiving conversations.',
    'Branches within one conversation.',
    'BranchSwitcher',
  ),
  BranchSwitcher: g(
    'Moving between branches created by edits and regenerations.',
    'Separate conversations.',
    'ThreadList',
  ),
  MessageQueue: g('Drafts waiting to send while a run is busy.', 'Sent messages.', 'Message'),
  FeedbackCapture: g(
    'Feedback with reasons and a correction, saved by your server.',
    'One-click thumbs only.',
    'MessageActions',
  ),
  // Tools and execution
  ToolCall: g(
    'One tool request with its input, result, failure and duration.',
    'Several calls of one step.',
    'ToolGroup',
  ),
  ToolResult: g(
    'Showing tool output safely, or through your own renderer.',
    'The whole call lifecycle.',
    'ToolCall',
  ),
  ToolGroup: g(
    'Several tool calls together, keeping each failure visible.',
    'A single call.',
    'ToolCall',
  ),
  AgentSteps: g(
    'The ordered steps of a run or workflow with their states, and prerequisites with dependencies.',
    'Timestamps and durations.',
    'ExecutionTimeline',
    'Plan',
  ),
  ExecutionTimeline: g(
    'A timed record of what happened during a run.',
    'The plan before it runs.',
    'Plan',
    'AgentSteps',
  ),
  Plan: g(
    'A proposed plan with its steps and a button to run it.',
    'What already happened.',
    'AgentSteps',
    'DryRunPreview',
  ),
  ChainOfThought: g(
    'The public steps of a run or a task log, with their sources or files.',
    'Private reasoning.',
    'Reasoning',
  ),
  WorkflowGraph: g(
    'Inspecting branches, loops and joins of a workflow.',
    'A simple linear list of stages.',
    'AgentSteps',
  ),
  RunInspector: g(
    'Inspecting the model, tool and agent spans of a run.',
    'A summary for non-technical readers.',
    'RunSummaryCard',
  ),
  ConnectionStatus: g(
    'The connection state with reconnect and replay actions.',
    'A run state.',
    'StatusBadge',
    'BackgroundStatus',
  ),
  RunBoard: g(
    'Many runs across threads, grouped by what they need.',
    'One run in detail.',
    'RunInspector',
    'RunSummaryCard',
  ),
  AttentionQueue: g(
    'Everything waiting on a person, in order.',
    'All runs including those that need nothing.',
    'RunBoard',
  ),
  AgentSteering: g(
    'Changing what a running agent does next without cancelling it.',
    'Starting a new run or answering a question the agent asked.',
    'PromptInput',
    'ClarificationRequest',
  ),
  CostLedger: g(
    'Cost per run or step over a period, with measured and estimated amounts kept apart.',
    'One number for the current request.',
    'UsageMeter',
  ),
  RunSummaryCard: g(
    'What a run did, read afterwards, with what it changed.',
    'Live progress.',
    'AgentSteps',
  ),
  BackgroundStatus: g(
    'A small indicator for runs still going elsewhere.',
    'The list of runs itself.',
    'RunBoard',
  ),
  RunCompare: g(
    'Two runs or checkpoints side by side.',
    'Two versions of one document.',
    'ArtifactDiff',
  ),
  AgentLanes: g(
    'Several agents working at once, on one time axis, with hand-offs.',
    'The steps inside one run.',
    'ExecutionTimeline',
  ),
  SubagentTree: g(
    'Parent and child runs and what spawned each.',
    'Flat lists of runs.',
    'RunBoard',
  ),
  UsageMeter: g(
    'Context or cost usage with what the number means.',
    'Calibration scores.',
    'ConfidenceNote',
  ),
  // Review and permissions
  ApprovalCard: g(
    'Approving or rejecting one proposed agent action, bound to its version.',
    'Generic confirmations unrelated to an agent.',
    'AlertDialog',
    'ApprovalBatch',
  ),
  PermissionRequest: g(
    'A request for specific access with its scope and version.',
    'One-off action approvals.',
    'ApprovalCard',
    'ScopeGrant',
  ),
  ScopeGrant: g(
    'Standing permissions with expiry, use counts and revoke.',
    'A single pending request.',
    'PermissionRequest',
  ),
  DryRunPreview: g(
    'The declared effects of a plan before anything runs, with a veto per line.',
    'Reviewing changes already made.',
    'ReviewChanges',
  ),
  ApprovalBatch: g(
    'Several same-scope proposals under one decision.',
    'Proposals with different targets or scopes.',
    'ApprovalCard',
  ),
  AccessModeSelector: g(
    'Requesting a broader access mode while keeping current permissions visible.',
    'Model settings.',
    'ModelControls',
  ),
  ReviewChanges: g(
    'Selecting proposed changes and submitting one review decision.',
    'Effects that have not run yet.',
    'DryRunPreview',
  ),
  AgentHandoff: g(
    'Transferring ownership of work between agents or people.',
    'Approving a single action.',
    'ApprovalCard',
  ),
  // Sources and evidence
  Sources: g(
    'A compact "Used N sources" disclosure under a reply.',
    'Linking a specific passage.',
    'Citation',
    'SourceCard',
  ),
  SourceCard: g('One source with its access state and excerpt.', 'A count of sources.', 'Sources'),
  Citation: g(
    'An inline reference that links a passage to its source.',
    'Lists of sources.',
    'Sources',
  ),
  EvidenceGroup: g('A claim with the sources that support it.', 'Single citations.', 'Citation'),
  GroundingStatus: g(
    'A defined grounding measure with its method.',
    'Model confidence.',
    'ConfidenceNote',
  ),
  ProvenanceBadge: g(
    'Where content came from, and whether your server verified a signature.',
    'Source details.',
    'SourceCard',
  ),
  ContextWindowMeter: g(
    'How full the context window is and what fills it.',
    'A single cost or token number.',
    'UsageMeter',
    'ContextInspector',
  ),
  ConfidenceNote: g(
    'A calibrated confidence score with its scope, method and date.',
    'Usage numbers.',
    'UsageMeter',
  ),
  // MCP, context, models, agents
  MCPServerCard: g(
    'One MCP server and its connection state.',
    'The tools it offers.',
    'MCPToolList',
  ),
  MCPToolList: g(
    'The tools a server offers and the permissions they need.',
    'Connection state.',
    'MCPServerCard',
  ),
  MCPAppFrame: g(
    'Showing an MCP App view in a sandbox, connected to your app through a bridge.',
    'Plain tool output.',
    'ToolResult',
  ),
  ContextBar: g(
    'What the current request includes, with removable items.',
    'A full inspection of included and excluded context.',
    'ContextInspector',
  ),
  ContextInspector: g(
    'What a request selected, included, excluded or truncated.',
    'A compact strip above the composer.',
    'ContextBar',
  ),
  MentionPicker: g(
    'Adding files, symbols, people or sources with "@".',
    'Commands.',
    'SlashCommandMenu',
  ),
  MemoryControls: g(
    'Asking to correct or delete one saved memory, with the state of each request.',
    'Browsing, filtering or pinning memories with where they came from.',
    'MemoryPanel',
  ),
  MarketingReveal: g(
    'Easing a marketing section into view as the page scrolls.',
    'Application screens, where motion delays reading.',
    'MarketingFeatures',
  ),
  MarketingIllustration: g(
    'A small themed scene beside a hero, a feature or an empty state on a marketing page.',
    'Product screenshots or data; show the real thing.',
    'MarketingHero',
  ),
  MarketingNumber: g(
    'A headline figure on a marketing page that counts up once.',
    'Live or changing numbers in an application.',
    'Stat',
  ),
  MemoryPanel: g(
    'Browsing, pinning and forgetting memories with their provenance.',
    'Correcting the text of one memory.',
    'MemoryControls',
  ),
  ModelSelector: g(
    'Picking the model for the next request.',
    'Settings beyond the model.',
    'ModelControls',
  ),
  ModelControls: g(
    'Model capabilities, settings and usage with their sources.',
    'Just choosing a model.',
    'ModelSelector',
  ),
  AgentCard: g('One agent with its capabilities and activity.', 'Runs across agents.', 'RunBoard'),
  AuditTrail: g('Searchable history of actions with outcomes.', 'Live runs.', 'RunBoard'),
  PolicyStatus: g(
    'Policy check results with who checked, when and what they covered.',
    'Permissions people can change.',
    'ScopeGrant',
  ),
  // Generated UI and forms
  GeneratedUI: g(
    'Showing a screen a model described, once it has been checked.',
    'Interfaces you write yourself.',
    'AIForm',
    'Chart',
  ),
  AIForm: g(
    'Controlled forms with conditional fields, validation and receipts.',
    'One short question.',
    'ClarificationRequest',
  ),
  ClarificationRequest: g(
    'A question the assistant needs answered before it continues.',
    'Optional follow-ups.',
    'Suggestions',
  ),
  Chart: g('Bar, line and area charts with an equivalent data table.', 'A single number.', 'Stat'),
  // Coding and artifacts
  CodeTabs: g('Several files of one example, with optional tour stops.', 'One command.', 'Snippet'),
  Snippet: g('One command with a copy button.', 'Whole files.', 'CodeTabs', 'MarkdownCodeBlock'),
  Commit: g('A commit with its subject, author and files.', 'Line-by-line changes.', 'CodeDiff'),
  EnvironmentVariables: g(
    'Environment variables with masked secrets.',
    'General settings forms.',
    'AIForm',
  ),
  PackageInfo: g('A package change with versions and dependencies.', 'Code changes.', 'CodeDiff'),
  SchemaDisplay: g('An API operation with parameters and bodies.', 'Data rows.', 'DataGrid'),
  StackTrace: g(
    'A readable error with internal frames collapsed.',
    'Process output.',
    'TerminalOutput',
  ),
  WebPreview: g(
    'A sandboxed preview of a web page with an address bar.',
    'MCP App views.',
    'MCPAppFrame',
  ),
  Image: g(
    'A generated or attached image with loading and failure states.',
    'Attached files of any type.',
    'Attachment',
  ),
  FileExplorer: g('Browsing a file tree and opening files.', 'Showing one file.', 'CodeTabs'),
  CodeDiff: g(
    'Unified or split comparison of code.',
    'Comparing artifact versions.',
    'ArtifactDiff',
  ),
  TerminalOutput: g(
    'Process output that follows along, with a stop button.',
    'Errors with frames.',
    'StackTrace',
  ),
  TestResults: g('Test outcomes with timings and diagnostics.', 'Raw output.', 'TerminalOutput'),
  ArtifactPanel: g(
    'A panel for generated documents and other artifacts.',
    'Inline previews.',
    'ArtifactPreview',
  ),
  ArtifactPreview: g(
    'Read-only previews of documents and tables.',
    'A panel with actions.',
    'ArtifactPanel',
  ),
  ArtifactDiff: g('Comparing two immutable artifact versions.', 'Code diffs.', 'CodeDiff'),
  // Rich content
  MarkdownResponse: g(
    'Formatted replies with headings, lists, tables, code and links.',
    'Plain streaming text where size matters.',
    'StreamingResponse',
  ),
  MarkdownCodeBlock: g('Copyable code with optional highlighting.', 'One command.', 'Snippet'),
  RichMarkdownResponse: g(
    'Markdown with math and Mermaid diagrams.',
    'Plain Markdown; it loads more.',
    'MarkdownResponse',
  ),
  MathFormula: g(
    'LaTeX formulas with accessible MathML.',
    'Whole Markdown replies.',
    'RichMarkdownResponse',
  ),
  MermaidDiagram: g(
    'A diagram written in Mermaid, with zoom and source view.',
    'Interactive workflows.',
    'WorkflowGraph',
  ),
  // Voice
  AudioPlayer: g('Playing generated or recorded audio.', 'Live capture.', 'VoiceControl'),
  Transcription: g('A timed transcript that follows playback.', 'Chat messages.', 'Message'),
  VoiceSelector: g('Choosing a speech voice with samples.', 'Choosing a model.', 'ModelSelector'),
  Persona: g('An animated presence for a voice agent.', 'People.', 'Avatar'),
  VoiceControl: g('Microphone choice, capture controls and levels.', 'Playback.', 'AudioPlayer'),
};

export function guidanceFor(name: string): UsageGuidance | undefined {
  return usageGuidance[name];
}
