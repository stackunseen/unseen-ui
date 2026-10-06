import type { MessageData, RuntimeSnapshot } from '@stackunseen/ui-core';
import type { AdapterScope } from '@stackunseen/ui-core/adapter';

export const initialDraft = 'Add a rollback owner and a clear pause criterion.';
export const responseChunks = [
  '\n\n2. Roll out to a small cohort. Compare error counts with the baseline before expanding.',
  '\n\n3. Name a rollback owner. Pause the rollout if error counts rise; preserve the incident notes.',
] as const;

export function scopeFor(attempt: number): AdapterScope {
  return Object.freeze({
    workspaceId: 'simulated-recovery-workspace',
    threadId: 'rollout-checklist',
    runId: `checklist-run-${attempt}`,
    attemptId: `checklist-attempt-${attempt}`,
    streamId: `checklist-stream-${attempt}`,
    schemaVersion: 2,
  });
}

export function initialSnapshot(): RuntimeSnapshot {
  const scope = scopeFor(1);
  const messages: MessageData[] = [
    {
      id: 'context-1',
      role: 'user',
      revision: 0,
      state: 'complete',
      text: 'We are preparing a staged rollout for our search update.',
    },
    {
      id: 'context-2',
      role: 'assistant',
      revision: 0,
      state: 'complete',
      text: 'Keep the checklist concise and assign an owner to each decision.',
    },
    {
      id: 'context-3',
      role: 'user',
      revision: 0,
      state: 'complete',
      text: 'The change affects query normalization. Start with an internal cohort.',
    },
    {
      id: 'context-4',
      role: 'assistant',
      revision: 0,
      state: 'complete',
      text: 'Record the baseline and keep the previous version available for rollback.',
    },
    {
      id: 'request-1',
      role: 'user',
      revision: 0,
      state: 'complete',
      text: 'Draft a rollout checklist with a rollback plan.',
    },
    {
      id: 'response-1',
      role: 'assistant',
      revision: 0,
      state: 'streaming',
      text: '1. Record the baseline before enabling the search update. Confirm that the internal cohort has a named owner.',
    },
  ];
  return {
    schemaVersion: 2,
    streamId: scope.streamId,
    lastSequence: 0,
    run: {
      id: scope.runId,
      attemptId: scope.attemptId,
      threadId: scope.threadId,
      version: 0,
      lifecycle: 'running',
      activity: 'Receiving a fixed sample checklist',
    },
    messages,
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
