import { sameDocumentIdentity, validTextRange } from '@stackunseen/ui-core/editing';
import type {
  DocumentIdentity,
  DocumentSnapshot,
  EditingCommand,
  EditingCommandState,
  TextRange,
  VersionedTextTarget,
} from '@stackunseen/ui-core/editing';

export interface WorkspaceReference {
  readonly document: DocumentSnapshot;
  readonly access: 'available' | 'denied';
}
export interface WorkspaceSearchHit {
  readonly id: string;
  readonly path: string;
  readonly target: VersionedTextTarget;
  readonly snippet: string;
}

/** Literal, bounded in-memory search. This is not a repository index or retrieval service. */
export function searchWorkspaceReferences(
  query: string,
  resources: readonly WorkspaceReference[],
): WorkspaceSearchHit[] {
  const term = query.trim();
  if (!term || term.length > 200) return [];
  const literal = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(literal, 'iu');
  const hits: WorkspaceSearchHit[] = [];
  for (const resource of resources.slice(0, 200)) {
    if (resource.access !== 'available' || resource.document.text.length > 100_000) continue;
    const snapshot = resource.document;
    const path = snapshot.path ?? snapshot.documentId;
    const match = matcher.exec(snapshot.text);
    if (!match && !matcher.test(path)) continue;
    const range: TextRange | undefined = match
      ? { from: match.index, to: match.index + match[0].length }
      : undefined;
    if (range && !validTextRange(range, snapshot.text)) continue;
    hits.push({
      id: `${snapshot.documentId}:${snapshot.version}`,
      path,
      target: { documentId: snapshot.documentId, version: snapshot.version, range },
      snippet: snapshot.text.slice(
        Math.max(0, (range?.from ?? 0) - 40),
        Math.min(snapshot.text.length, (range?.to ?? 0) + 120),
      ),
    });
    if (hits.length === 40) break;
  }
  return hits;
}

export function currentWorkspaceHit(
  hit: WorkspaceSearchHit,
  resources: readonly WorkspaceReference[],
): boolean {
  const resource = resources.find((entry) => entry.document.documentId === hit.target.documentId);
  return (
    !!resource &&
    resource.access === 'available' &&
    sameDocumentIdentity(resource.document, hit.target) &&
    (!hit.target.range || validTextRange(hit.target.range, resource.document.text))
  );
}

export interface ProjectInstructionState {
  readonly document: DocumentSnapshot;
  readonly draft: DocumentSnapshot & { readonly base: DocumentIdentity };
  readonly sequence: number;
  readonly state: EditingCommandState;
  readonly failNext: boolean;
  readonly loseAcknowledgement: boolean;
  readonly stored?: { readonly document: DocumentSnapshot; readonly command: EditingCommand };
}

export function createProjectInstructions(): ProjectInstructionState {
  const document = {
    documentId: 'search-web:instructions',
    version: 'instructions:1',
    text: 'Preserve internal query spaces. Use accessible labels. Review exact file changes before applying. Test results in this workspace are fixed samples.',
    language: 'plain',
  };
  return {
    document,
    draft: {
      ...document,
      version: 'instructions-draft:1',
      base: { documentId: document.documentId, version: document.version },
    },
    sequence: 1,
    state: { status: 'idle' },
    failNext: false,
    loseAcknowledgement: false,
  };
}
export function projectInstructionCommand(snapshot: ProjectInstructionState): EditingCommand {
  if (snapshot.state.status === 'pending' || snapshot.state.status === 'unknown')
    return { commandId: snapshot.state.commandId, target: { ...snapshot.state.target } };
  return {
    commandId: `instructions-save:${snapshot.sequence + 1}`,
    target: { documentId: snapshot.draft.documentId, version: snapshot.draft.version },
  };
}
export type ProjectInstructionAction =
  | { type: 'edit'; text: string }
  | { type: 'configure'; failNext: boolean; loseAcknowledgement: boolean }
  | { type: 'save'; command: EditingCommand; base: DocumentIdentity; text: string }
  | { type: 'lookup'; command: EditingCommand }
  | { type: 'reload' }
  | { type: 'external-change' };

/** Small deterministic host; source strings are not executed and nothing is saved to disk. */
export function projectInstructionReducer(
  snapshot: ProjectInstructionState,
  action: ProjectInstructionAction,
): ProjectInstructionState {
  const locked = snapshot.state.status === 'pending' || snapshot.state.status === 'unknown';
  if (action.type === 'edit') {
    if (locked || action.text.length > 20_000 || action.text === snapshot.draft.text)
      return snapshot;
    return {
      ...snapshot,
      sequence: snapshot.sequence + 1,
      draft: {
        ...snapshot.draft,
        version: `instructions-draft:${snapshot.sequence + 1}`,
        text: action.text,
      },
      state: { status: 'idle' },
    };
  }
  if (action.type === 'configure')
    return locked
      ? snapshot
      : { ...snapshot, failNext: action.failNext, loseAcknowledgement: action.loseAcknowledgement };
  if (action.type === 'reload')
    return locked
      ? snapshot
      : {
          ...snapshot,
          sequence: snapshot.sequence + 1,
          draft: {
            ...snapshot.document,
            version: `instructions-draft:${snapshot.sequence + 1}`,
            base: { documentId: snapshot.document.documentId, version: snapshot.document.version },
          },
          state: { status: 'idle' },
        };
  if (action.type === 'external-change')
    return locked
      ? snapshot
      : {
          ...snapshot,
          document: {
            ...snapshot.document,
            version: `instructions:external-${snapshot.sequence + 1}`,
          },
          sequence: snapshot.sequence + 1,
        };
  if (action.type === 'lookup') {
    if (
      snapshot.state.status !== 'unknown' ||
      !snapshot.stored ||
      action.command.commandId !== snapshot.stored.command.commandId ||
      !sameDocumentIdentity(action.command.target, snapshot.stored.command.target)
    )
      return snapshot;
    return {
      ...snapshot,
      document: snapshot.stored.document,
      draft: {
        ...snapshot.draft,
        base: {
          documentId: snapshot.stored.document.documentId,
          version: snapshot.stored.document.version,
        },
      },
      stored: undefined,
      state: {
        status: 'settled',
        receipt: {
          ...snapshot.stored.command,
          result: 'applied',
          nextVersion: snapshot.stored.document.version,
        },
      },
    };
  }
  if (
    locked ||
    action.command.commandId !== projectInstructionCommand(snapshot).commandId ||
    !sameDocumentIdentity(action.command.target, snapshot.draft) ||
    !sameDocumentIdentity(snapshot.draft.base, snapshot.document) ||
    !sameDocumentIdentity(action.base, snapshot.document) ||
    action.text !== snapshot.draft.text ||
    action.text.length > 20_000
  )
    return snapshot;
  if (snapshot.document.text === snapshot.draft.text) return snapshot;
  const sequence = snapshot.sequence + 1;
  if (snapshot.failNext)
    return {
      ...snapshot,
      sequence,
      failNext: false,
      state: {
        status: 'settled',
        receipt: {
          ...action.command,
          result: 'rejected',
          reason: 'The in-memory server rejected this save. Your draft is retained.',
        },
      },
    };
  const document = { ...snapshot.document, version: `instructions:${sequence}`, text: action.text };
  if (snapshot.loseAcknowledgement)
    return {
      ...snapshot,
      sequence,
      loseAcknowledgement: false,
      stored: {
        command: { commandId: action.command.commandId, target: { ...action.command.target } },
        document,
      },
      state: {
        status: 'unknown',
        commandId: action.command.commandId,
        target: { ...action.command.target },
      },
    };
  return {
    ...snapshot,
    sequence,
    document,
    draft: {
      ...snapshot.draft,
      base: { documentId: document.documentId, version: document.version },
    },
    state: {
      status: 'settled',
      receipt: { ...action.command, result: 'applied', nextVersion: document.version },
    },
  };
}
