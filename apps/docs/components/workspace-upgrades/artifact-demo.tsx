'use client';
import { useReducer } from 'react';
import { Accordion, ArtifactPanel, Button, Select, Textarea } from '@stackunseen/ui';
import { CodeEditor } from '@stackunseen/ui/editor';
import { ArtifactEditor } from '@stackunseen/ui/artifact-editor';
import type {
  ArtifactDraft,
  ArtifactDraftChange,
  ArtifactEditorView,
  ArtifactExportIntent,
  ArtifactReceiptLookup,
  ArtifactSaveIntent,
} from '@stackunseen/ui/artifact-editor';
import { sameDocumentIdentity } from '@stackunseen/ui-core/editing';
import type {
  DocumentSnapshot,
  EditingCommandState,
  EditingReceipt,
} from '@stackunseen/ui-core/editing';
import css from './artifact-demo.module.css';
import { queryDocument, queryDraftText } from './workspace-sample';

interface DemoState {
  sample: boolean;
  document: DocumentSnapshot;
  draft: ArtifactDraft;
  savedRevision: number;
  sequence: number;
  open: boolean;
  view: ArtifactEditorView;
  access: 'available' | 'revoked';
  fault: 'none' | 'reject' | 'lost-ack';
  saveState: EditingCommandState;
  exportState: EditingCommandState;
  originalSave?: EditingReceipt;
  exportPreview?: DocumentSnapshot;
}
type DemoAction =
  | { type: 'change'; change: ArtifactDraftChange }
  | { type: 'save'; intent: ArtifactSaveIntent }
  | { type: 'export'; intent: ArtifactExportIntent }
  | { type: 'lookup'; command: ArtifactReceiptLookup }
  | { type: 'open'; open: boolean }
  | { type: 'view'; view: ArtifactEditorView }
  | { type: 'fault'; fault: DemoState['fault'] }
  | { type: 'access' | 'external-change' | 'retry' | 'reset' };

export function createArtifactDemo(sequence = 1, sample = false): DemoState {
  const document = sample
    ? queryDocument
    : {
        documentId: 'greeting',
        version: '1',
        text: "export const greeting = 'Hello';\n",
        language: 'typescript',
        path: 'greeting.ts',
      };
  return {
    sample,
    document,
    draft: {
      ...document,
      version: `draft-${sequence}`,
      base: document,
      text: sample ? queryDraftText : "export const greeting = 'Hello from Unseen UI';\n",
    },
    savedRevision: 1,
    sequence,
    open: false,
    view: 'edit',
    access: 'available',
    fault: 'none',
    saveState: { status: 'idle' },
    exportState: { status: 'idle' },
  };
}

function blocked(state: DemoState): boolean {
  return (
    state.access === 'revoked' ||
    !sameDocumentIdentity(state.draft.base, state.document) ||
    ['pending', 'unknown'].includes(state.saveState.status) ||
    ['pending', 'unknown'].includes(state.exportState.status)
  );
}

/** In-memory example host only. It performs no provider, filesystem or network work. */
export function artifactDemoTransition(state: DemoState, action: DemoAction): DemoState {
  if (action.type === 'open') return { ...state, open: action.open };
  if (action.type === 'view') return { ...state, view: action.view };
  if (action.type === 'fault') return { ...state, fault: action.fault };
  if (action.type === 'access')
    return { ...state, access: state.access === 'available' ? 'revoked' : 'available' };
  if (action.type === 'reset')
    return { ...createArtifactDemo(state.sequence + 1, state.sample), open: state.open };
  if (action.type === 'retry')
    return state.saveState.status === 'settled' && state.saveState.receipt.result === 'rejected'
      ? { ...state, sequence: state.sequence + 1, saveState: { status: 'idle' }, fault: 'none' }
      : state;
  if (action.type === 'external-change')
    return blocked(state)
      ? state
      : {
          ...state,
          savedRevision: state.savedRevision + 1,
          document: {
            ...state.document,
            version: String(state.savedRevision + 1),
            text: state.document.text + '// Changed in the local host.\n',
          },
        };
  if (action.type === 'lookup') {
    if (
      state.access === 'revoked' ||
      action.command.kind !== 'save' ||
      state.saveState.status !== 'unknown' ||
      !state.originalSave ||
      action.command.commandId !== state.saveState.commandId ||
      !sameDocumentIdentity(action.command.target, state.saveState.target)
    )
      return state;
    return { ...state, saveState: { status: 'settled', receipt: state.originalSave } };
  }
  if (blocked(state)) return state;
  if (action.type === 'change')
    return sameDocumentIdentity(action.change.target, state.draft) &&
      action.change.text.length <= 100_000
      ? {
          ...state,
          sequence: state.sequence + 1,
          draft: {
            ...state.draft,
            version: `draft-${state.sequence + 1}`,
            text: action.change.text,
          },
        }
      : state;
  if (action.type === 'export') {
    const intent = action.intent;
    if (
      intent.commandId !== `artifact-export-${state.sequence}` ||
      !sameDocumentIdentity(intent.target, state.draft) ||
      !sameDocumentIdentity(intent.document, state.draft) ||
      intent.document.text !== state.draft.text ||
      intent.document.path !== state.draft.path ||
      intent.document.language !== state.draft.language ||
      (state.exportState.status === 'settled' &&
        state.exportState.receipt.commandId === intent.commandId)
    )
      return state;
    return {
      ...state,
      exportPreview: Object.freeze({
        documentId: state.draft.documentId,
        version: state.draft.version,
        text: state.draft.text,
        path: state.draft.path,
        language: state.draft.language,
      }),
      exportState: {
        status: 'settled',
        receipt: {
          commandId: intent.commandId,
          target: intent.target,
          result: 'applied',
          nextVersion: state.draft.version,
        },
      },
    };
  }
  if (action.type !== 'save') return state;
  const intent = action.intent;
  if (
    intent.commandId !== `artifact-save-${state.sequence}` ||
    !sameDocumentIdentity(intent.target, state.draft) ||
    !sameDocumentIdentity(intent.base, state.document) ||
    intent.text !== state.draft.text ||
    state.draft.text === state.document.text ||
    (state.saveState.status === 'settled' && state.saveState.receipt.commandId === intent.commandId)
  )
    return state;
  const receipt: EditingReceipt =
    state.fault === 'reject'
      ? {
          commandId: intent.commandId,
          target: intent.target,
          result: 'rejected',
          reason: 'Local host rejected this save. The draft is preserved.',
        }
      : {
          commandId: intent.commandId,
          target: intent.target,
          result: 'applied',
          nextVersion: String(state.savedRevision + 1),
        };
  const document =
    receipt.result === 'applied'
      ? { ...state.document, version: receipt.nextVersion, text: intent.text }
      : state.document;
  return {
    ...state,
    document,
    draft: { ...state.draft, base: document },
    originalSave: receipt,
    savedRevision: receipt.result === 'applied' ? state.savedRevision + 1 : state.savedRevision,
    saveState:
      state.fault === 'lost-ack'
        ? { status: 'unknown', commandId: intent.commandId, target: intent.target }
        : { status: 'settled', receipt },
  };
}

export function ArtifactDemo({
  inline = false,
  sample = false,
}: {
  inline?: boolean;
  sample?: boolean;
}) {
  const [state, dispatch] = useReducer(artifactDemoTransition, undefined, () =>
    createArtifactDemo(1, sample),
  );
  const target = { documentId: state.draft.documentId, version: state.draft.version };
  const body = (
    <div className={css.root}>
      <ArtifactEditor
        document={state.document}
        draft={state.draft}
        label={sample ? 'Query artifact draft' : 'Greeting artifact draft'}
        view={state.view}
        onViewChange={(view) => dispatch({ type: 'view', view })}
        access={state.access}
        onDraftChange={(change) => dispatch({ type: 'change', change })}
        saveCommand={{ commandId: `artifact-save-${state.sequence}`, target }}
        saveState={state.saveState}
        onSave={(intent) => dispatch({ type: 'save', intent })}
        exportCommand={{ commandId: `artifact-export-${state.sequence}`, target }}
        exportState={state.exportState}
        onExport={(intent) => dispatch({ type: 'export', intent })}
        onLookupReceipt={(command) => dispatch({ type: 'lookup', command })}
        renderEditor={({ document, readOnly, label, onDocumentChange }) => (
          <CodeEditor
            document={document}
            readOnly={readOnly}
            label={label}
            onChange={(change) => onDocumentChange({ target: change.target, text: change.text })}
          />
        )}
      />
      {state.access === 'available' && state.exportPreview && (
        <div className={css.root}>
          <p className={css.note}>
            Prepared export · {state.exportPreview.version}. This preview is kept in memory; no file
            was written.
          </p>
          <Textarea aria-label="Prepared export text" value={state.exportPreview.text} readOnly />
        </div>
      )}
      <Accordion
        type="single"
        collapsible
        headingLevel={3}
        items={[
          {
            value: 'host',
            title: inline ? 'Demo options' : 'Local host controls',
            keepMounted: true,
            content: (
              <div className={css.root}>
                <label>
                  Save behavior
                  <Select
                    aria-label="Local save behavior"
                    value={state.fault}
                    options={[
                      { value: 'none', label: 'Acknowledge local save' },
                      { value: 'lost-ack', label: 'Lose save acknowledgement' },
                      { value: 'reject', label: 'Reject local save' },
                    ]}
                    onValueChange={(fault) => {
                      if (fault === 'none' || fault === 'lost-ack' || fault === 'reject')
                        dispatch({ type: 'fault', fault });
                    }}
                  />
                </label>
                <div className={css.actions}>
                  <Button
                    variant="outline"
                    onClick={() => dispatch({ type: 'external-change' })}
                    disabled={blocked(state)}
                  >
                    Change saved base
                  </Button>
                  <Button variant="outline" onClick={() => dispatch({ type: 'access' })}>
                    {state.access === 'available' ? 'Revoke local access' : 'Restore local access'}
                  </Button>
                  {state.saveState.status === 'settled' &&
                    state.saveState.receipt.result === 'rejected' && (
                      <Button variant="outline" onClick={() => dispatch({ type: 'retry' })}>
                        Issue new local command
                      </Button>
                    )}
                  <Button variant="ghost" onClick={() => dispatch({ type: 'reset' })}>
                    Reset local example
                  </Button>
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
  if (inline) return body;
  return (
    <div className={css.root}>
      <p className={css.note}>
        Edit a versioned draft with the optional CodeEditor. Saves stay in this page; export
        prepares an exact text preview. Refresh discards this local example.
      </p>
      <ArtifactPanel
        artifact={{
          id: state.document.documentId,
          version: state.savedRevision,
          kind: 'text',
          title: 'Greeting artifact',
          content: state.document.text,
          sourceIds: [],
        }}
        variant="fullscreen"
        open={state.open}
        onOpenChange={(open) => dispatch({ type: 'open', open })}
        trigger={<Button variant="outline">Open artifact editor</Button>}
        actions={
          <Button variant="outline" onClick={() => dispatch({ type: 'open', open: false })}>
            Close artifact
          </Button>
        }
        body={body}
      />
    </div>
  );
}
