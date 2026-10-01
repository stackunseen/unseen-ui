import type { ConversationContext } from '@ai-interaction/core';

export const context: ConversationContext = {
  workspaceId: 'workspace',
  threadId: 'thread',
  branchId: 'main',
  snapshotId: 'snapshot',
  version: '1',
};

export const thread = { id: 'thread', title: 'Review change', version: '1' },
  branches = [
    { id: 'main', label: 'Main', version: '1' },
    { id: 'review', label: 'Review', version: '2', parentId: 'main', parentVersion: '1' },
  ];

export const item = {
  id: 'item',
  version: '1',
  text: 'Review the queue',
  state: 'queued' as const,
};
