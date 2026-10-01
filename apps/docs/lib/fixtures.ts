import type {
  ApprovalProposal,
  Artifact,
  RuntimeSnapshot,
  Source,
  Step,
  ToolCallData,
} from '@ai-interaction/core';

export const source: Source = {
  id: 'source-handbook',
  title: 'Customer operations handbook',
  kind: 'document',
  version: '2026.09',
  locator: 'Section 4 · Account reviews',
  access: 'available',
  excerpt: 'Accounts with no activity for 90 days should be reviewed by an owner before archival.',
};
export const artifact: Artifact = {
  id: 'review-report',
  version: 1,
  title: 'Account review summary',
  kind: 'text',
  content:
    'Account review\n\n3 inactive accounts were identified in the simulated dataset.\n\nProposed action: archive the accounts after an owner reviews the change.\n\nEvidence: Customer operations handbook, section 4.\n\nThis is fixture data. No external system was accessed.',
  sourceIds: [source.id],
};
export const steps: Step[] = [
  {
    id: 'understand',
    label: 'Understand the request',
    state: 'succeeded',
    detail: 'Public summary: identify accounts that need an owner review.',
    dependencyIds: [],
  },
  {
    id: 'search',
    label: 'Find inactive accounts',
    state: 'succeeded',
    detail: 'Simulated CRM returned 3 records.',
    dependencyIds: ['understand'],
  },
  {
    id: 'review',
    label: 'Request owner approval',
    state: 'running',
    detail: 'Execution waits for the host to acknowledge a decision.',
    dependencyIds: ['search'],
  },
  { id: 'report', label: 'Prepare a summary', state: 'queued', dependencyIds: ['review'] },
];
export const tool: ToolCallData = {
  id: 'query-accounts',
  name: 'search_accounts',
  revision: 1,
  state: 'succeeded',
  input: '{\n  "inactive_days": 90,\n  "limit": 20\n}',
  output: '3 inactive accounts found\nAcme Sandbox · Example Studio · Demo Works',
  durationMs: 820,
};
export const proposal: ApprovalProposal = {
  id: 'approval-1',
  version: 1,
  runId: 'run-demo',
  toolCallId: 'archive-accounts',
  actionDigest: 'fixture-archive-3-v1',
  title: 'Archive 3 inactive accounts',
  target: 'CRM sandbox · Demo workspace',
  scopes: ['accounts:archive'],
  impact: '3 accounts become read-only. An administrator can restore them.',
  expiresAt: '2030-01-01T00:00:00.000Z',
  risk: 'medium',
  status: 'pending',
};
export function initialSnapshot(): RuntimeSnapshot {
  return {
    schemaVersion: 1,
    streamId: 'stream-demo',
    lastSequence: 0,
    run: {
      id: 'run-demo',
      threadId: 'thread-demo',
      attemptId: 'attempt-1',
      version: 0,
      lifecycle: 'queued',
    },
    messages: [],
    steps: [],
    tools: [],
    approval: null,
    sources: [],
    artifacts: [],
    connection: 'connected',
    stale: false,
    diagnostic: null,
  };
}
