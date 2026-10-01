import type {
  AccessMode,
  CommandOption,
  ReferenceOption,
  ReasoningOption,
  WorkspaceFile,
  AIField,
  GraphNode,
  GraphEdge,
} from '@ai-interaction/react';
export const commands: CommandOption[] = [
  { id: 'review', label: 'review', description: 'Review the current changes for regressions.' },
  { id: 'plan', label: 'plan', description: 'Outline an implementation before making changes.' },
  { id: 'tests', label: 'tests', description: 'Choose the tests to run.' },
  {
    id: 'deploy',
    label: 'deploy',
    description: 'Deploy the workspace.',
    disabledReason: 'Deployment is unavailable in this workspace.',
  },
];
export const references: ReferenceOption[] = [
  {
    id: 'search',
    label: 'src/search.ts',
    description: 'Search query normalization',
    kind: 'file',
    version: 'a1',
  },
  {
    id: 'tests',
    label: 'tests/search.test.ts',
    description: 'Search behavior tests',
    kind: 'file',
    version: 'a1',
  },
  {
    id: 'symbol',
    label: 'normalizeQuery',
    description: 'Function in src/search.ts',
    kind: 'symbol',
    version: 'a1',
  },
  {
    id: 'private',
    label: 'private.env',
    description: 'Workspace credentials',
    kind: 'file',
    version: 'a1',
    disabledReason: 'This reference is not accessible.',
  },
];
export const efforts: ReasoningOption[] = [
  { id: 'low', label: 'Low', description: 'A smaller reasoning budget for straightforward work.' },
  { id: 'medium', label: 'Medium', description: 'A balanced budget for multi-step work.' },
  {
    id: 'high',
    label: 'High',
    description: 'More reasoning effort for complex work. May take longer.',
  },
];
export const accessModes: AccessMode[] = [
  {
    id: 'read',
    label: 'Read only',
    description: 'Read workspace files. No edits or process execution.',
  },
  {
    id: 'workspace',
    label: 'Workspace access',
    description: 'Edit workspace files and request approved commands.',
  },
  {
    id: 'full',
    label: 'Full access',
    description: 'Access outside the workspace.',
    disabledReason: 'Not permitted by this workspace policy.',
  },
];
export const files: WorkspaceFile[] = [
  { id: 'search', path: 'src/search.ts', change: 'modified' },
  { id: 'app', path: 'src/app.tsx' },
  { id: 'test', path: 'tests/search.test.ts', change: 'added' },
  { id: 'readme', path: 'README.md' },
  { id: 'secret', path: 'private.env', access: 'denied' },
];
export const before =
  'export function normalizeQuery(value: string) {\n  return value.toLowerCase();\n}\n';
export const after =
  'export function normalizeQuery(value: string) {\n  return value.trim().toLocaleLowerCase("en-US");\n}\n';
export const formFields: AIField[] = [
  { id: 'name', label: 'Project name', type: 'text', required: true },
  {
    id: 'environment',
    label: 'Environment',
    type: 'select',
    required: true,
    options: [
      { value: 'preview', label: 'Preview' },
      { value: 'production', label: 'Production' },
    ],
  },
  {
    id: 'replicas',
    label: 'Replicas',
    type: 'number',
    min: 1,
    max: 10,
    when: { field: 'environment', equals: 'production' },
  },
  {
    id: 'notes',
    label: 'Notes',
    type: 'textarea',
    description: 'Optional context for the reviewer.',
  },
];
export const nodes: GraphNode[] = [
  { id: 'plan', label: 'Plan', state: 'complete', x: 15, y: 50 },
  { id: 'code', label: 'Implement', state: 'complete', x: 50, y: 22 },
  { id: 'test', label: 'Test', state: 'running', x: 50, y: 78 },
  { id: 'review', label: 'Review', state: 'queued', x: 85, y: 50 },
];
export const edges: GraphEdge[] = [
  { id: 'a', from: 'plan', to: 'code' },
  { id: 'b', from: 'plan', to: 'test' },
  { id: 'c', from: 'code', to: 'review' },
  { id: 'd', from: 'test', to: 'review' },
];
export const diagrams: Record<string, string> = {
  Default:
    'flowchart LR\n  Request --> Plan\n  Plan --> Code\n  Code --> Tests\n  Tests --> Review',
  Sequence:
    'sequenceDiagram\n  participant User\n  participant Agent\n  participant Tool\n  User->>Agent: Review changes\n  Agent->>Tool: Read diff\n  Tool-->>Agent: Changed files\n  Agent-->>User: Public summary',
  Class:
    'classDiagram\n  class Message {\n    +String id\n    +String text\n  }\n  class Thread {\n    +String id\n  }\n  Thread "1" --> "many" Message',
  State:
    'stateDiagram-v2\n  [*] --> Queued\n  Queued --> Running\n  Running --> Complete\n  Running --> Failed\n  Complete --> [*]',
  'Entity relationship':
    'erDiagram\n  THREAD ||--o{ MESSAGE : contains\n  MESSAGE ||--o{ PART : includes',
  Gantt:
    'gantt\n  title Release preparation\n  dateFormat YYYY-MM-DD\n  section Work\n  Implement :a, 2026-09-30, 2d\n  Verify :after a, 1d',
  Pie: 'pie title Synthetic test results\n  "Passed" : 18\n  "Failed" : 2\n  "Skipped" : 1',
  Mindmap: 'mindmap\n  root((Agent UI))\n    Conversation\n    Coding\n    Review\n    Voice',
  Timeline:
    'timeline\n  title Synthetic run\n  0 seconds : Request received\n  5 seconds : Files inspected\n  12 seconds : Tests complete',
  'Git graph':
    'gitGraph\n  commit\n  branch feature\n  checkout feature\n  commit\n  checkout main\n  merge feature',
  'Math labels': 'flowchart LR\n  A["$$x^2 + y^2 = z^2$$"] --> B["Result"]',
  'Sequence math':
    'sequenceDiagram\n  participant Learner\n  participant Tutor\n  Learner->>Tutor: Explain $$x^2 + y^2 = z^2$$\n  Tutor-->>Learner: A right triangle relationship',
  Invalid: 'flowchart LR\n A[Unclosed',
  Restricted: 'flowchart LR\n A --> B\n click A "https://example.com"',
  'Blocked resource':
    'flowchart LR\n A@{ "\\u0069mg": "/__mermaid_blocked_image__.svg", label: "Untrusted image" }',
};
export const richMarkdown =
  '# Implementation notes\n\nNormalize a vector with $\\hat{x} = x / \\lVert x \\rVert$.\n\n$$\n\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n$$\n\n```mermaid\nflowchart LR\n  Input --> Validate\n  Validate --> Render\n```\n\n```ts\nconst ready = true;\n```\n\n- [x] Review the source\n- [ ] Confirm the result';
