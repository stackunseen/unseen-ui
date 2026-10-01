import type {
  ModelCapabilities,
  ModelSettings,
  ModelUsage,
  ContextInspection,
  ConnectionInfo,
  PolicyCheck,
} from '@ai-interaction/core';

// Fictional models, usage and authority records: these are not product capability or price claims.
export const modelCapabilities: ModelCapabilities = {
  revision: 'fixture-3',
  source: 'Synthetic capability fixture',
  observedAt: '2026-09-29T12:00:00Z',
  models: [
    {
      id: 'atlas-fast',
      label: 'Atlas Fast',
      provider: 'Demo provider',
      available: true,
      modes: [
        { id: 'balanced', label: 'Balanced' },
        { id: 'concise', label: 'Concise' },
      ],
      toolIds: ['search-docs'],
      temperature: { min: 0, max: 1, step: 0.1 },
    },
    {
      id: 'atlas-research',
      label: 'Atlas Research',
      provider: 'Demo provider',
      available: true,
      modes: [{ id: 'deep', label: 'Deep research' }],
      toolIds: ['search-docs', 'compare-records'],
    },
    {
      id: 'atlas-legacy',
      label: 'Atlas Legacy',
      provider: 'Demo provider',
      available: false,
      unavailableReason: 'This model was retired from the demo workspace.',
      modes: [],
      toolIds: [],
    },
  ],
  tools: [
    { id: 'search-docs', label: 'Search documents', available: true },
    { id: 'compare-records', label: 'Compare records', available: true },
    {
      id: 'archive-records',
      label: 'Archive records',
      available: false,
      unavailableReason: 'Write permission is not granted.',
    },
  ],
};
export const modelSettings: ModelSettings = {
  modelId: 'atlas-fast',
  modeId: 'balanced',
  toolIds: ['search-docs'],
  temperature: 0.4,
};
export const modelUsage: ModelUsage = {
  modelId: 'atlas-fast',
  kind: 'estimated',
  inputTokens: 4200,
  outputTokens: 850,
  source: 'Synthetic usage record',
  observedAt: '2026-09-29T12:00:00Z',
  cost: {
    amount: 0.0124,
    currency: 'USD',
    basis: 'Fixture calculation only; not a provider price.',
  },
};
export const contextInspection: ContextInspection = {
  revision: 'context-7',
  source: 'Synthetic context snapshot',
  observedAt: '2026-09-29T12:00:00Z',
  items: [
    {
      id: 'handbook',
      label: 'Operations handbook',
      version: '2026.09',
      selected: true,
      inclusion: 'included',
      access: 'available',
      originalTokens: 1600,
      includedTokens: 1000,
      truncated: true,
      reason: 'Only the account-review section fits the allocated context budget.',
    },
    {
      id: 'brief',
      label: 'Customer brief',
      version: '2',
      selected: true,
      inclusion: 'excluded',
      access: 'revoked',
      originalTokens: 450,
      includedTokens: 0,
      reason: 'Access was revoked before the request was assembled.',
    },
    {
      id: 'instructions',
      label: 'Workspace instructions',
      version: '3',
      selected: false,
      inclusion: 'included',
      access: 'available',
      originalTokens: 200,
      includedTokens: 200,
      reason: 'Automatically included by the workspace policy.',
    },
  ],
  usage: {
    used: 4200,
    limit: 16000,
    kind: 'estimated',
    model: 'atlas-fast',
    measuredAt: '2026-09-29T12:00:00Z',
  },
};
export const connectionInfo: ConnectionInfo = {
  state: 'disconnected',
  recovery: 'none',
  adapter: { name: 'Demo stream adapter', version: '1', resume: true, snapshot: true },
  cursor: { streamId: 'stream-demo', sequence: 42 },
  detail: 'The network connection was interrupted after the latest received event.',
};
export const policyChecks: PolicyCheck[] = [
  {
    id: 'retention',
    label: 'Retention policy',
    result: 'pass',
    freshness: 'current',
    detail: 'The reviewed records are outside the required retention window.',
    attestation: {
      source: 'Synthetic policy authority',
      scope: 'Demo workspace · account review',
      policyVersion: 'retention-v3',
      checkedAt: '2026-09-29T12:00:00Z',
    },
  },
  {
    id: 'tool-access',
    label: 'Tool access',
    result: 'warn',
    freshness: 'current',
    detail: 'Read access is available. Archival still requires a separate approval.',
    attestation: {
      source: 'Synthetic access authority',
      scope: 'search-docs · current user',
      policyVersion: 'access-v2',
      checkedAt: '2026-09-29T12:00:00Z',
    },
  },
];
