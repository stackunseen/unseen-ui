'use client';
import { CodeEditor } from '@stackunseen/ui/editor';
import { ArtifactEditor } from '@stackunseen/ui/artifact-editor';
import { MessageEditForm } from '@stackunseen/ui/conversation-flow';
import type { ConversationMessageTarget } from '@stackunseen/ui/conversation-flow';
import { applyTextEdits } from '@stackunseen/ui-core/editing';
import type { DocumentSnapshot } from '@stackunseen/ui-core/editing';
import '@stackunseen/ui/editor.css';
import '@stackunseen/ui/artifact-editor.css';
import '@stackunseen/ui/conversation-flow.css';
const document: DocumentSnapshot = {
  documentId: 'public-edit',
  version: '1',
  text: 'const value = 1;\n',
  language: 'typescript',
};
const target: ConversationMessageTarget = {
  documentId: 'public-message',
  version: '1',
  workspaceId: 'w',
  threadId: 't',
  branchId: 'b',
  branchVersion: '1',
  attemptId: 'a',
  role: 'user',
};
const draft = { documentId: target.documentId, version: 'draft:1', text: 'Revised prompt' };
export function EditingPublicExample() {
  const result = applyTextEdits(document, document, [{ range: { from: 14, to: 15 }, insert: '2' }]);
  return (
    <section aria-label="Packed editing examples">
      <CodeEditor document={document} readOnly label="Public code editor" />
      <ArtifactEditor
        document={document}
        draft={{
          ...document,
          version: 'draft:1',
          text: result.ok ? result.text : document.text,
          base: document,
        }}
        view="edit"
        onDraftChange={() => {}}
      />
      <MessageEditForm
        autoFocus={false}
        target={target}
        current={{ ...target, text: 'Original prompt' }}
        draft={draft}
        command={{
          kind: 'edit',
          commandId: 'public-branch',
          target,
          draft,
          newBranchId: 'new-branch',
        }}
        state={{ status: 'idle' }}
        onDraftChange={() => {}}
        onRequest={() => {}}
        onCancel={() => {}}
      />
    </section>
  );
}
