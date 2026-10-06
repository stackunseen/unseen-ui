import {
  sameDocumentIdentity,
  type DocumentIdentity,
  type DocumentSnapshot,
  type EditingCommand,
  type EditingCommandState,
} from '@stackunseen/ui-core/editing';
import type { ArtifactDraft } from './types.js';

export const maxArtifactCharacters = 100_000;

export function identity(value: DocumentIdentity): DocumentIdentity {
  return Object.freeze({ documentId: value.documentId, version: value.version });
}

export function snapshot(value: DocumentSnapshot): DocumentSnapshot {
  return Object.freeze({
    ...identity(value),
    text: value.text,
    ...(value.language !== undefined ? { language: value.language } : {}),
    ...(value.path !== undefined ? { path: value.path } : {}),
  });
}

function validIdentity(value: DocumentIdentity): boolean {
  return (
    !!value &&
    typeof value.documentId === 'string' &&
    !!value.documentId.trim() &&
    value.documentId.length <= 512 &&
    typeof value.version === 'string' &&
    !!value.version.trim() &&
    value.version.length <= 512
  );
}

function validSnapshot(value: DocumentSnapshot): boolean {
  return (
    validIdentity(value) &&
    typeof value.text === 'string' &&
    value.text.length <= maxArtifactCharacters &&
    (value.language === undefined ||
      (typeof value.language === 'string' && value.language.length <= 128)) &&
    (value.path === undefined || (typeof value.path === 'string' && value.path.length <= 2048))
  );
}

export function validArtifactDraft(document: DocumentSnapshot, draft: ArtifactDraft): boolean {
  return (
    validSnapshot(document) &&
    validSnapshot(draft) &&
    validIdentity(draft.base) &&
    document.documentId === draft.documentId &&
    document.documentId === draft.base.documentId &&
    (!sameDocumentIdentity(document, draft) || document.text === draft.text)
  );
}

export function validCommand(value: EditingCommand): boolean {
  return (
    !!value &&
    typeof value.commandId === 'string' &&
    !!value.commandId.trim() &&
    value.commandId.length <= 512 &&
    validIdentity(value.target)
  );
}

export function validCommandState(state: EditingCommandState): boolean {
  if (!state) return false;
  if (state.status === 'idle') return true;
  if (state.status === 'pending' || state.status === 'unknown') return validCommand(state);
  if (state.status !== 'settled' || !validCommand(state.receipt)) return false;
  return state.receipt.result === 'applied'
    ? typeof state.receipt.nextVersion === 'string' &&
        !!state.receipt.nextVersion.trim() &&
        state.receipt.nextVersion.length <= 512
    : state.receipt.result === 'rejected' && typeof state.receipt.reason === 'string';
}

export function canSubmit(
  command: EditingCommand | undefined,
  state: EditingCommandState,
  draft: ArtifactDraft,
): boolean {
  return (
    !!command &&
    validCommand(command) &&
    sameDocumentIdentity(command.target, draft) &&
    (state.status === 'idle' ||
      (state.status === 'settled' && state.receipt.commandId !== command.commandId))
  );
}

export function pending(state: EditingCommandState): boolean {
  return state.status === 'pending' || state.status === 'unknown';
}

export function currentReceipt(state: EditingCommandState, draft: ArtifactDraft): boolean {
  return state.status === 'settled' && sameDocumentIdentity(state.receipt.target, draft);
}

export function savedDocument(state: EditingCommandState, document: DocumentSnapshot): boolean {
  return (
    state.status === 'settled' &&
    state.receipt.result === 'applied' &&
    state.receipt.target.documentId === document.documentId &&
    state.receipt.nextVersion === document.version
  );
}

export function commandProblem(
  command: EditingCommand | undefined,
  state: EditingCommandState,
  draft: ArtifactDraft,
): string | undefined {
  if (!command) return undefined;
  if (!validCommand(command) || !sameDocumentIdentity(command.target, draft))
    return 'The offered command does not target this draft revision.';
  if (
    state.status === 'settled' &&
    command.commandId === state.receipt.commandId &&
    !sameDocumentIdentity(command.target, state.receipt.target)
  )
    return 'A command ID was reused for another revision. The host must issue a new command.';
  return undefined;
}
