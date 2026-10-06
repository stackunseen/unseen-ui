import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EditingCommandState } from '@stackunseen/ui-core/editing';
import { ArtifactEditor } from './artifact-editor.js';
import type { ArtifactDraft, ArtifactEditorProps, ArtifactEditorView } from './types.js';

const document = {
  documentId: 'story-report',
  version: 'saved-1',
  text: 'First report\n',
  path: 'report.md',
};
const draft: ArtifactDraft = {
  ...document,
  base: document,
  version: 'draft-1',
  text: 'Reviewed report\n',
};
const command = {
  commandId: 'story-save',
  target: { documentId: draft.documentId, version: draft.version },
};
const meta = {
  title: 'Unseen UI/ArtifactEditor',
  component: ArtifactEditor,
  args: { document, draft, saveCommand: command, view: 'preview' },
} satisfies Meta<typeof ArtifactEditor>;
export default meta;
type Story = StoryObj<typeof meta>;

function ControlledDraft(args: ArtifactEditorProps) {
  const [current, setDraft] = useState(args.draft);
  const [view, setView] = useState<ArtifactEditorView>('edit');
  const [revision, setRevision] = useState(1);
  return (
    <ArtifactEditor
      {...args}
      draft={current}
      view={view}
      onViewChange={setView}
      saveCommand={undefined}
      onDraftChange={({ text }) => {
        setRevision(revision + 1);
        setDraft({ ...current, text, version: `draft-${revision + 1}` });
      }}
    />
  );
}
export const Controlled: Story = { render: (args) => <ControlledDraft {...args} /> };
export const Dirty: Story = {};
export const Saving: Story = { args: { saveState: { ...command, status: 'pending' } } };
export const Unknown: Story = { args: { saveState: { ...command, status: 'unknown' } } };
export const Conflict: Story = { args: { document: { ...document, version: 'saved-2' } } };
export const Revoked: Story = { args: { access: 'revoked' } };
export const Rejected: Story = {
  args: {
    saveState: {
      status: 'settled',
      receipt: { ...command, result: 'rejected', reason: 'The host rejected this save.' },
    },
  },
};
const savedDocument = { ...document, version: 'saved-2', text: draft.text };
const savedState: EditingCommandState = {
  status: 'settled',
  receipt: { ...command, result: 'applied', nextVersion: savedDocument.version },
};
export const Saved: Story = {
  args: {
    document: savedDocument,
    draft: { ...draft, base: savedDocument },
    saveState: savedState,
  },
};
