import { catalog } from './catalog';

/** A job a developer is trying to do, and the components that do it together. */
export interface ComponentTask {
  id: string;
  label: string;
  description: string;
  components: readonly string[];
}

export const componentTasks: readonly ComponentTask[] = [
  {
    id: 'ai-chat',
    label: 'AI chat',
    description: 'A composer, the messages, a streaming reply and the actions on it.',
    components: [
      'PromptInput',
      'Message',
      'StreamingResponse',
      'MessageActions',
      'Suggestions',
      'Attachment',
      'FileDropzone',
      'ModelSelector',
      'FeedbackCapture',
    ],
  },
  {
    id: 'agent-execution',
    label: 'Agent execution',
    description: 'What an agent did, step by step, with its tool calls and results.',
    components: [
      'AgentSteps',
      'ToolCall',
      'ToolResult',
      'ToolGroup',
      'ExecutionTimeline',
      'RunInspector',
      'Plan',
      'Task',
      'UsageMeter',
    ],
  },
  {
    id: 'runs',
    label: 'Runs and background work',
    description: 'Many runs across threads, what is waiting on a person, and what a run did.',
    components: [
      'RunBoard',
      'AttentionQueue',
      'RunSummaryCard',
      'BackgroundStatus',
      'RunCompare',
      'SubagentTree',
    ],
  },
  {
    id: 'ai-review',
    label: 'Approvals and review',
    description: 'Decisions a person makes before or after an agent acts.',
    components: [
      'ApprovalCard',
      'PermissionRequest',
      'ReviewChanges',
      'DryRunPreview',
      'ApprovalBatch',
      'ScopeGrant',
      'AccessModeSelector',
      'ClarificationRequest',
    ],
  },
  {
    id: 'generative-ui',
    label: 'Generated interfaces',
    description: 'Validated forms, tables and charts a model describes and the host renders.',
    components: ['GeneratedUI', 'AIForm', 'DataTable', 'Chart'],
  },
  {
    id: 'sources',
    label: 'Sources and evidence',
    description: 'Where an answer came from and how far it is grounded.',
    components: [
      'SourceCard',
      'Citation',
      'EvidenceGroup',
      'GroundingStatus',
      'Sources',
      'ProvenanceBadge',
      'ConfidenceNote',
    ],
  },
  {
    id: 'mcp',
    label: 'MCP servers and tool views',
    description: 'Connections, the tools they offer and the views tools can bring.',
    components: ['MCPServerCard', 'MCPToolList', 'MCPAppFrame'],
  },
  {
    id: 'enterprise-forms',
    label: 'Forms',
    description: 'Labelled fields, choices, validation feedback and the buttons that submit them.',
    components: ['Field', 'Input', 'Textarea', 'Select', 'Checkbox', 'Switch', 'Alert', 'Button'],
  },
  {
    id: 'data',
    label: 'Tables and data',
    description: 'Native tables, grids and the controls around them.',
    components: ['Table', 'DataGrid', 'Pagination', 'Matrix', 'StatusBadge'],
  },
  {
    id: 'navigation',
    label: 'Site navigation',
    description: 'Finding and moving between pages and sections.',
    components: [
      'CommandPalette',
      'TableOfContents',
      'Breadcrumb',
      'Tabs',
      'Stepper',
      'Pagination',
    ],
  },
];

const known = new Set<string>(catalog.map((entry) => entry.name));
/** Tasks that list this component, with only components that exist in the catalog. */
export function tasksFor(name: string): ComponentTask[] {
  return componentTasks
    .filter((task) => task.components.includes(name))
    .map((task) => ({ ...task, components: task.components.filter((item) => known.has(item)) }));
}
/** Search terms a task contributes to each of its components. */
export function taskTerms(name: string): string[] {
  return tasksFor(name).flatMap((task) => [task.id.replace(/-/g, ' '), task.label.toLowerCase()]);
}
