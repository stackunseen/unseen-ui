import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MessageEditForm } from './message-edit-form.js';
import type { ConversationActionState, ConversationMessageTarget } from './contracts.js';

const target: ConversationMessageTarget = {
  documentId: 'message-1',
  version: '1',
  workspaceId: 'workspace',
  threadId: 'thread',
  branchId: 'main',
  branchVersion: '1',
  attemptId: 'attempt-1',
  role: 'user',
};
function Example({ status = 'idle' }: { status?: 'idle' | 'pending' | 'unknown' }) {
  const [draft, setDraft] = useState({
    documentId: 'draft',
    version: '1',
    text: 'Explain the source selection.',
  });
  const command = {
    kind: 'edit' as const,
    commandId: 'edit-1',
    target,
    draft,
    newBranchId: 'branch-2',
  };
  const [state, setState] = useState<ConversationActionState>(
    status === 'idle' ? { status } : { status, command },
  );
  return (
    <MessageEditForm
      target={target}
      current={{ ...target, text: 'Original message' }}
      draft={draft}
      command={command}
      state={state}
      onDraftChange={(text) =>
        setDraft((value) => ({ ...value, version: String(Number(value.version) + 1), text }))
      }
      onRequest={(original) => setState({ status: 'pending', command: original })}
      onCancel={() => {}}
      onReconcile={() => {}}
    />
  );
}
const meta = { title: 'Unseen UI/ConversationFlow', component: Example } satisfies Meta<
  typeof Example
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Editing: Story = {};
export const Pending: Story = { args: { status: 'pending' } };
export const Unknown: Story = { args: { status: 'unknown' } };
