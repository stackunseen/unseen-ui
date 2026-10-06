'use client';
import { useRef, useState } from 'react';
import { Accordion, Button } from '@stackunseen/ui';
import { CodeEditor } from '@stackunseen/ui/editor';
import type {
  CodeEditorChange,
  CodeEditorProposal,
  CodeEditorProposalIntent,
  CodeEditorSelection,
} from '@stackunseen/ui/editor';
import { applyTextEdits, sameDocumentIdentity, validTextRange } from '@stackunseen/ui-core/editing';
import type {
  DocumentSnapshot,
  EditingCommandState,
  EditingReceipt,
} from '@stackunseen/ui-core/editing';
import css from './editor-demo.module.css';
import { queryDocument } from './workspace-sample';

const initial: DocumentSnapshot = {
  documentId: 'editor-demo',
  version: 'draft-1',
  path: 'answer.ts',
  language: 'typescript',
  text: 'const answer = 41;\n',
};
/** In-memory host fixture. No model, network, filesystem or durable receipt service. */
export function EditorDemo({ sample = false }: { sample?: boolean }) {
  const [document, setDocument] = useState(sample ? queryDocument : initial);
  const [selection, setSelection] = useState<CodeEditorSelection>(
    sample ? { anchor: 14, head: 16 } : { anchor: 15, head: 17 },
  );
  const [proposal, setProposal] = useState<CodeEditorProposal>();
  const [commandState, setCommandState] = useState<EditingCommandState>({ status: 'idle' });
  const [readOnly, setReadOnly] = useState(false);
  const [feedback, setFeedback] = useState(
    'Select text or place the cursor, then request a local proposal.',
  );
  const serial = useRef(1);
  const pending = useRef<CodeEditorProposalIntent | undefined>(undefined);
  const original = useRef<{ receipt: EditingReceipt; snapshot?: DocumentSnapshot } | undefined>(
    undefined,
  );
  const busy = commandState.status === 'pending' || commandState.status === 'unknown';
  const version = () => `draft-${++serial.current}`;
  const change = (request: CodeEditorChange) => {
    if (busy || readOnly || !sameDocumentIdentity(request.target, document)) return;
    const result = applyTextEdits(document, request.target, request.edits);
    if (!result.ok || result.text !== request.text) return;
    setDocument({ ...document, version: version(), text: result.text });
    setSelection(request.selection);
    setFeedback('The local host updated the draft revision. Nothing was saved.');
  };
  const suggest = (kind: CodeEditorProposal['kind']) => {
    const range =
      kind === 'completion'
        ? { from: selection.head, to: selection.head }
        : {
            from: Math.min(selection.anchor, selection.head),
            to: Math.max(selection.anchor, selection.head),
          };
    const edits = [
      { range, insert: kind === 'completion' ? ' // completed locally' : sample ? '20' : '42' },
    ];
    if (kind === 'selection-edit' && range.to < document.text.length)
      edits.push({
        range: { from: document.text.length, to: document.text.length },
        insert: '// Reviewed locally\n',
      });
    setProposal({
      proposalId: 'local-editor-proposal',
      version: `proposal-${++serial.current}`,
      target: { documentId: document.documentId, version: document.version },
      kind,
      edits,
    });
    setCommandState({ status: 'idle' });
    setFeedback('A fixed local text proposal is ready for review.');
  };
  const intent = (request: CodeEditorProposalIntent) => {
    if (busy || readOnly || !sameDocumentIdentity(request.target, document)) return;
    if (
      request.acceptedPrefix !== undefined &&
      (!proposal ||
        proposal.kind !== 'completion' ||
        proposal.edits.length !== 1 ||
        !Number.isSafeInteger(request.acceptedPrefix) ||
        request.acceptedPrefix <= 0 ||
        request.acceptedPrefix >= proposal.edits[0]!.insert.length ||
        proposal.edits[0]!.range.from !== proposal.edits[0]!.range.to ||
        !validTextRange({ from: 0, to: request.acceptedPrefix }, proposal.edits[0]!.insert))
    )
      return;
    if (
      !proposal ||
      request.proposalId !== proposal.proposalId ||
      request.proposalVersion !== proposal.version ||
      request.editIndices.some((index, position) => {
        const original = proposal.edits[index],
          edit = request.edits[position];
        return (
          !original ||
          !edit ||
          edit.range.from !== original.range.from ||
          edit.range.to !== original.range.to ||
          edit.insert !==
            (request.acceptedPrefix === undefined
              ? original.insert
              : original.insert.slice(0, request.acceptedPrefix))
        );
      })
    )
      return;
    if (request.type === 'dismiss') {
      setProposal(undefined);
      setFeedback('The local host dismissed the proposal.');
      return;
    }
    pending.current = request;
    original.current = undefined;
    setCommandState({
      status: 'pending',
      commandId: `local-edit-${++serial.current}`,
      target: request.target,
    });
  };
  const resolve = (outcome: 'apply' | 'unknown' | 'reject') => {
    if (commandState.status !== 'pending' || !pending.current) return;
    const result = applyTextEdits(document, pending.current.target, pending.current.edits);
    const command = { commandId: commandState.commandId, target: commandState.target };
    const snapshot =
      outcome !== 'reject' && result.ok
        ? { ...document, text: result.text, version: version() }
        : undefined;
    const receipt: EditingReceipt = snapshot
      ? { ...command, result: 'applied', nextVersion: snapshot.version }
      : {
          ...command,
          result: 'rejected',
          reason: outcome === 'reject' ? 'Simulated host rejection' : 'Document revision conflict',
        };
    original.current = { receipt, snapshot };
    if (outcome === 'unknown') {
      setCommandState({ ...command, status: 'unknown' });
      setFeedback('The simulated host stored a result, but its acknowledgement was lost.');
      return;
    }
    if (snapshot) {
      setDocument(snapshot);
      setSelection({ anchor: 0, head: 0 });
    }
    setCommandState({ status: 'settled', receipt });
    setProposal(undefined);
    pending.current = undefined;
    setFeedback(
      snapshot
        ? 'The local host applied the requested edits to its draft. Nothing was saved.'
        : 'The local host rejected the request. The draft is unchanged.',
    );
  };
  return (
    <div className={css.root}>
      <div className={css.actions}>
        <Button size="sm" disabled={busy || readOnly} onClick={() => suggest('selection-edit')}>
          Suggest selection edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy || readOnly}
          onClick={() => suggest('completion')}
        >
          Suggest completion
        </Button>
      </div>
      <CodeEditor
        document={document}
        selection={selection}
        onChange={change}
        onSelectionChange={(request) => {
          if (sameDocumentIdentity(request.target, document)) setSelection(request.selection);
        }}
        readOnly={readOnly}
        proposal={proposal}
        commandState={commandState}
        onProposalIntent={intent}
        onLookupOriginal={(command) => {
          const stored = original.current;
          if (
            !stored ||
            stored.receipt.commandId !== command.commandId ||
            !sameDocumentIdentity(stored.receipt.target, command.target)
          )
            return;
          if (stored.snapshot) {
            setDocument(stored.snapshot);
            setSelection({ anchor: 0, head: 0 });
          }
          setCommandState({ status: 'settled', receipt: stored.receipt });
          setProposal(undefined);
          pending.current = undefined;
          setFeedback('The local host returned the original receipt. No request was replayed.');
        }}
      />
      {commandState.status === 'pending' ? (
        <div className={css.actions} aria-label="Simulated host response">
          <Button size="sm" onClick={() => resolve('apply')}>
            Confirm locally
          </Button>
          <Button size="sm" variant="outline" onClick={() => resolve('unknown')}>
            Simulate lost acknowledgement
          </Button>
          <Button size="sm" variant="ghost" onClick={() => resolve('reject')}>
            Reject locally
          </Button>
        </div>
      ) : null}
      <p role="status">{feedback}</p>
      <Accordion
        type="single"
        collapsible
        headingLevel={3}
        items={[
          {
            value: 'options',
            title: 'Demo options',
            keepMounted: true,
            content: (
              <Button
                variant="outline"
                disabled={busy}
                aria-pressed={readOnly}
                onClick={() => setReadOnly(!readOnly)}
              >
                Read-only
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
}
