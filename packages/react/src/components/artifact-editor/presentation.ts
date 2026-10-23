import { sameDocumentIdentity } from '@stackunseen/ui-core/editing';
import { commandProblem, currentReceipt, pending, savedDocument } from './model.js';
import type { ArtifactEditorProps } from './types.js';

export function artifactPresentation({
  document,
  draft,
  access,
  saveState,
  exportState,
  saveCommand,
  exportCommand,
}: Required<
  Pick<ArtifactEditorProps, 'document' | 'draft' | 'access' | 'saveState' | 'exportState'>
> &
  Pick<ArtifactEditorProps, 'saveCommand' | 'exportCommand'>) {
  const dirty = draft.text !== document.text;
  const conflict = !sameDocumentIdentity(draft.base, document);
  const awaitingDocument =
    currentReceipt(saveState, draft) &&
    saveState.status === 'settled' &&
    saveState.receipt.result === 'applied' &&
    (!savedDocument(saveState, document) || dirty);
  const busy = pending(saveState) || pending(exportState) || awaitingDocument;
  const problem =
    saveCommand && exportCommand && saveCommand.commandId === exportCommand.commandId
      ? 'Save and export need different request IDs.'
      : (commandProblem(saveCommand, saveState, draft) ??
        commandProblem(exportCommand, exportState, draft));
  const locked = access !== 'available' || conflict || busy || !!problem;
  const saved = !dirty && currentReceipt(saveState, draft) && savedDocument(saveState, document);
  const rejected =
    (currentReceipt(saveState, draft) &&
      saveState.status === 'settled' &&
      saveState.receipt.result === 'rejected') ||
    (currentReceipt(exportState, draft) &&
      exportState.status === 'settled' &&
      exportState.receipt.result === 'rejected');
  const status = conflict
    ? 'conflict'
    : saveState.status === 'unknown' || exportState.status === 'unknown'
      ? 'unknown'
      : saveState.status === 'pending' || awaitingDocument
        ? 'saving'
        : exportState.status === 'pending'
          ? 'exporting'
          : problem || rejected
            ? 'error'
            : saved
              ? 'saved'
              : access === 'read-only'
                ? 'read-only'
                : dirty
                  ? 'dirty'
                  : 'clean';
  const message = conflict
    ? `The saved document changed from ${draft.base.version} to ${document.version}. Bring your draft up to date before saving.`
    : (problem ??
      (awaitingDocument
        ? 'Save received. Waiting for the saved document.'
        : saved
          ? `Saved at revision ${document.version}.`
          : dirty
            ? 'Unsaved changes.'
            : 'No unsaved changes.'));
  return { dirty, conflict, busy, problem, locked, status, message };
}
