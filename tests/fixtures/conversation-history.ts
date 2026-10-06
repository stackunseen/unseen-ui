import type { ConversationHistory } from '@stackunseen/ui-core/history';
import type { MessageData } from '@stackunseen/ui-core';

export const context = { workspaceId: 'w', threadId: 't', snapshotId: 's', version: '1' };

export const row = (id = 'm'): Extract<MessageData, { text: string }> => ({
  id,
  role: 'assistant',
  text: `Public message ${id}`,
  state: 'complete',
  revision: 0,
});

export const history = (changes: Partial<ConversationHistory> = {}): ConversationHistory => ({
  context,
  messages: [row()],
  older: { state: 'end' },
  newer: { state: 'end' },
  startIndex: 0,
  totalMessages: 1,
  ...changes,
});
