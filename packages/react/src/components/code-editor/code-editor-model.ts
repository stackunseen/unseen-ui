import { applyTextEdits, sameDocumentIdentity, validTextRange } from '@stackunseen/ui-core/editing';
import type { DocumentSnapshot } from '@stackunseen/ui-core/editing';
import { lineBoundary } from './text-offsets.js';
import type {
  CodeEditorDiagnostic,
  CodeEditorProps,
  CodeEditorProposal,
  CodeEditorSelection,
} from './code-editor-types.js';

export const EDITOR_LIMIT = 100_000;
export function validDocument(document: DocumentSnapshot): boolean {
  return (
    sameDocumentIdentity(document, document) &&
    typeof document.text === 'string' &&
    document.text.length <= EDITOR_LIMIT
  );
}
export function validSelection(selection: CodeEditorSelection, text: string): boolean {
  return (
    !!selection &&
    lineBoundary(text, selection.anchor) &&
    lineBoundary(text, selection.head) &&
    validTextRange(
      {
        from: Math.min(selection.anchor, selection.head),
        to: Math.max(selection.anchor, selection.head),
      },
      text,
    )
  );
}
export function editorWritable(props: CodeEditorProps): boolean {
  return (
    validDocument(props.document) &&
    !props.readOnly &&
    !!props.onChange &&
    (props.status ?? 'ready') === 'ready' &&
    !['pending', 'unknown'].includes(props.commandState?.status ?? 'idle') &&
    (!props.selection || validSelection(props.selection, props.document.text))
  );
}
export function proposalKey(proposal: CodeEditorProposal): string {
  return JSON.stringify([
    proposal.proposalId,
    proposal.version,
    proposal.target.documentId,
    proposal.target.version,
  ]);
}
export function proposalIssue(
  document: DocumentSnapshot,
  proposal: CodeEditorProposal,
): string | undefined {
  if (
    !proposal.proposalId?.trim() ||
    !proposal.version?.trim() ||
    !['completion', 'selection-edit'].includes(proposal.kind) ||
    !proposal.edits?.length
  )
    return 'Invalid proposal';
  const checked = applyTextEdits(document, proposal.target, proposal.edits, EDITOR_LIMIT);
  if (
    checked.ok &&
    proposal.edits.some(
      (edit) =>
        !lineBoundary(document.text, edit.range.from) ||
        !lineBoundary(document.text, edit.range.to),
    )
  )
    return 'Proposal splits a line ending';
  if (!checked.ok)
    return checked.reason === 'stale'
      ? 'Proposal belongs to an earlier revision'
      : 'Proposal has invalid or overlapping edits';
}

export function currentDiagnostics(
  document: DocumentSnapshot,
  diagnostics: readonly CodeEditorDiagnostic[] = [],
): readonly CodeEditorDiagnostic[] {
  if (!Array.isArray(diagnostics) || !validDocument(document)) return [];
  return diagnostics
    .slice(0, 200)
    .filter(
      (d) =>
        d &&
        typeof d.id === 'string' &&
        typeof d.message === 'string' &&
        (!d.source || typeof d.source === 'string') &&
        ['error', 'warning', 'info', 'hint'].includes(d.severity) &&
        sameDocumentIdentity(d.target, document) &&
        validTextRange(d.range, document.text) &&
        lineBoundary(document.text, d.range.from) &&
        lineBoundary(document.text, d.range.to),
    );
}

/** A single completion may accept its next word; whole-edit subset acceptance remains separate. */
export function completionPrefix(proposal: CodeEditorProposal): number | undefined {
  if (
    proposal.kind !== 'completion' ||
    !Array.isArray(proposal.edits) ||
    proposal.edits.length !== 1
  )
    return;
  const edit = proposal.edits[0]!;
  if (edit.range.from !== edit.range.to || typeof edit.insert !== 'string') return;
  const length = /^\s*\S+\s*/u.exec(edit.insert)?.[0].length;
  if (
    length &&
    length < edit.insert.length &&
    validTextRange({ from: 0, to: length }, edit.insert) &&
    lineBoundary(edit.insert, length)
  )
    return length;
}
