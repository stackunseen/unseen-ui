'use client';
import { useId, useRef } from 'react';
import { sameDocumentIdentity } from '@stackunseen/ui-core/editing';
import { Button } from '../button/button.js';
import { CodeEditorView } from './code-editor-view.js';
import {
  currentDiagnostics,
  editorWritable,
  proposalIssue,
  proposalKey,
  validDocument,
  validSelection,
  completionPrefix,
} from './code-editor-model.js';
import type { CodeEditorProps, CodeEditorProposalIntent } from './code-editor-types.js';
import css from './code-editor.module.css';

export type { CodeEditorProps } from './code-editor-types.js';
/** Optional real editor. Authentication, proposal generation and applying edits belong to the host. */
export function CodeEditor(props: CodeEditorProps) {
  const {
    document,
    proposal,
    commandState = { status: 'idle' },
    status: hostStatus = 'ready',
    diagnostics = [],
  } = props;
  const descriptionId = useId();
  const sent = useRef<string | undefined>(undefined);
  const previous = useRef(document);
  const revisionConflict =
    sameDocumentIdentity(previous.current, document) && previous.current.text !== document.text;
  if (!revisionConflict) previous.current = document;
  const status = revisionConflict ? 'conflict' : hostStatus;
  const effectiveProps = revisionConflict
    ? { ...props, status: 'conflict' as const, diagnostics: [] }
    : props;
  const valid = validDocument(document);
  const writable = editorWritable(effectiveProps);
  const selectionInvalid =
    valid && props.selection && !validSelection(props.selection, document.text);
  const issue = revisionConflict
    ? 'Document text changed without a new revision'
    : proposal
      ? proposalIssue(document, proposal)
      : undefined;
  const busy = commandState.status === 'pending' || commandState.status === 'unknown';
  const proposalEnabled = !!proposal && writable && !issue && !!props.onProposalIntent;
  const request = (
    type: CodeEditorProposalIntent['type'],
    indices?: readonly number[],
  ): boolean => {
    if (!proposal || !proposalEnabled || sent.current === proposalKey(proposal)) return false;
    const editIndices =
      type === 'dismiss'
        ? []
        : type === 'partial-accept'
          ? (indices ?? [])
          : proposal.edits.map((_, index) => index);
    const acceptedPrefix = type === 'partial-accept' ? completionPrefix(proposal) : undefined;
    if (
      type === 'partial-accept' &&
      (!editIndices.length ||
        (editIndices.length >= proposal.edits.length && acceptedPrefix === undefined) ||
        new Set(editIndices).size !== editIndices.length ||
        editIndices.some(
          (index) => !Number.isSafeInteger(index) || index < 0 || index >= proposal.edits.length,
        ))
    )
      return false;
    const intent: CodeEditorProposalIntent = {
      type,
      proposalId: proposal.proposalId,
      proposalVersion: proposal.version,
      target: { documentId: proposal.target.documentId, version: proposal.target.version },
      editIndices: [...editIndices],
      ...(acceptedPrefix === undefined ? {} : { acceptedPrefix }),
      edits: editIndices.map((index) => ({
        range: { ...proposal.edits[index]!.range },
        insert:
          acceptedPrefix === undefined
            ? proposal.edits[index]!.insert
            : proposal.edits[index]!.insert.slice(0, acceptedPrefix),
      })),
    };
    sent.current = proposalKey(proposal);
    try {
      props.onProposalIntent!(intent);
    } catch (error) {
      sent.current = undefined;
      throw error;
    }
    return true;
  };
  const visibleDiagnostics = revisionConflict ? [] : currentDiagnostics(document, diagnostics);
  const hiddenDiagnostics = diagnostics.length - visibleDiagnostics.length;
  const receipt = commandState.status === 'settled' ? commandState.receipt : undefined;
  const currentReceipt =
    receipt &&
    (sameDocumentIdentity(receipt.target, document) ||
      (receipt.result === 'applied' &&
        receipt.target.documentId === document.documentId &&
        receipt.nextVersion === document.version));
  const description = !valid
    ? 'Document is invalid or exceeds the 100,000 character limit.'
    : selectionInvalid
      ? 'Selection is invalid for this revision.'
      : status === 'loading'
        ? 'Loading document. Editing is unavailable.'
        : status === 'unsupported'
          ? 'This document is unsupported. Editing is unavailable.'
          : status === 'stale'
            ? 'Document is stale. Refresh its revision before editing.'
            : status === 'conflict'
              ? 'Document conflict. Resolve it in the host before editing.'
              : status === 'error'
                ? 'The host reported a document error.'
                : commandState.status === 'pending'
                  ? 'Edit request pending host acknowledgement.'
                  : commandState.status === 'unknown'
                    ? 'Edit outcome unknown. Check the original request before continuing.'
                    : !writable
                      ? 'Read-only document.'
                      : 'Draft edits are controlled by the host. Tab moves out of the editor.';
  return (
    <section
      className={`${css.root} ${props.className ?? ''}`}
      style={props.style}
      aria-label={`${props.label ?? document.path ?? 'Code editor'} workspace`}
      data-part="code-editor"
      data-status={status}
    >
      <div className={css.header}>
        <strong>{props.label ?? document.path ?? 'Code editor'}</strong>
        <span>{document.version}</span>
      </div>
      <p id={descriptionId} role="status" className={css.notice}>
        {description}
      </p>
      {commandState.status === 'unknown' ? (
        <div className={css.actions}>
          <Button
            size="sm"
            variant="outline"
            disabled={!props.onLookupOriginal || props.lookupPending}
            onClick={() => {
              if (!props.onLookupOriginal || props.lookupPending) return;
              props.onLookupOriginal({
                commandId: commandState.commandId,
                target: { ...commandState.target },
              });
            }}
          >
            {props.lookupPending ? 'Checking original edit request' : 'Check original edit request'}
          </Button>
        </div>
      ) : null}
      {valid ? (
        <CodeEditorView
          key={document.documentId}
          props={effectiveProps}
          descriptionId={descriptionId}
          request={request}
        />
      ) : null}
      {document.language &&
      ![
        'javascript',
        'js',
        'jsx',
        'typescript',
        'ts',
        'tsx',
        'plain',
        'plaintext',
        'text',
      ].includes(document.language.toLowerCase()) ? (
        <p className={css.notice}>
          Plain-text editing; syntax support is unavailable for {document.language}.
        </p>
      ) : null}
      {hiddenDiagnostics > 0 ? (
        <p className={css.notice}>
          {hiddenDiagnostics} stale, invalid or excess diagnostics withheld.
        </p>
      ) : null}
      {visibleDiagnostics.length ? (
        <ul className={css.diagnostics} aria-label="Document diagnostics">
          {visibleDiagnostics.map((d, index) => (
            <li key={`${d.id}-${index}`}>
              <strong>{d.severity}</strong>: {d.message.slice(0, 2000)}{' '}
              <span>
                ({d.range.from}–{d.range.to})
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {proposal ? (
        <section
          className={css.proposal}
          aria-label={
            proposal.kind === 'completion' ? 'Completion proposal' : 'Selection edit proposal'
          }
        >
          <strong>
            {proposal.label?.slice(0, 300) ??
              (proposal.kind === 'completion' ? 'Completion proposal' : 'Selection edit proposal')}
          </strong>
          {issue ? (
            <p role="status">{issue}</p>
          ) : (
            <p className={css.notice}>
              Review {proposal.edits.length} edit{proposal.edits.length === 1 ? '' : 's'} for
              revision {proposal.target.version}. Accept sends a host intent.
            </p>
          )}
          {(Array.isArray(proposal.edits) ? proposal.edits : [])
            .slice(0, 50)
            .filter((edit) => edit && typeof edit.insert === 'string' && edit.range)
            .map((edit, index) => (
              <div key={index} className={css.edit}>
                <span>
                  Edit {index + 1} · {edit.range.from}–{edit.range.to}
                </span>
                <pre>
                  {edit.insert.slice(0, 2000) || '(delete text)'}
                  {edit.insert.length > 2000 ? '\n… preview truncated' : ''}
                </pre>
                {proposal.edits.length > 1 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!proposalEnabled}
                    onClick={() => request('partial-accept', [index])}
                  >
                    Accept edit {index + 1}
                  </Button>
                ) : null}
              </div>
            ))}
          <div className={css.actions}>
            {completionPrefix(proposal) !== undefined && (
              <Button
                size="sm"
                variant="outline"
                disabled={!proposalEnabled}
                onClick={() => request('partial-accept', [0])}
              >
                Accept next word
              </Button>
            )}
            <Button size="sm" disabled={!proposalEnabled} onClick={() => request('accept')}>
              Accept proposal
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={!proposalEnabled}
              onClick={() => request('dismiss')}
            >
              Dismiss proposal
            </Button>
          </div>
          <p className={css.notice}>
            Ctrl/Cmd+Enter accepts; Alt+Right accepts the next word of a completion or the first of
            multiple edits; Escape dismisses.
          </p>
        </section>
      ) : null}
      {receipt ? (
        <p role="status" className={css.notice}>
          {currentReceipt
            ? receipt.result === 'rejected'
              ? `Host rejected the edit: ${receipt.reason}`
              : `Host acknowledged the edit at revision ${receipt.nextVersion}.`
            : 'Edit receipt belongs to a different revision.'}
        </p>
      ) : null}
      {busy ? (
        <span className={css.notice}>
          Further edits are unavailable until the host resolves this request.
        </span>
      ) : null}
    </section>
  );
}
