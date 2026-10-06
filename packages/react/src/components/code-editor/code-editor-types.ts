import type { CSSProperties } from 'react';
import type {
  DocumentIdentity,
  DocumentSnapshot,
  EditingCommand,
  EditingCommandState,
  TextEdit,
  TextRange,
} from '@stackunseen/ui-core/editing';

/** UTF-16 offsets. Backward selections retain their anchor/head direction. */
export interface CodeEditorSelection {
  readonly anchor: number;
  readonly head: number;
}
export interface CodeEditorChange {
  readonly target: DocumentIdentity;
  readonly text: string;
  readonly edits: readonly TextEdit[];
  readonly selection: CodeEditorSelection;
}
export interface CodeEditorSelectionChange {
  readonly target: DocumentIdentity;
  readonly selection: CodeEditorSelection;
}
export interface CodeEditorDiagnostic {
  readonly id: string;
  readonly target: DocumentIdentity;
  readonly range: TextRange;
  readonly severity: 'error' | 'warning' | 'info' | 'hint';
  readonly message: string;
  readonly source?: string;
}
/** Host-generated text only. No executable completion/rendering callbacks. */
export interface CodeEditorProposal {
  readonly proposalId: string;
  readonly version: string;
  readonly target: DocumentIdentity;
  readonly kind: 'completion' | 'selection-edit';
  readonly label?: string;
  readonly edits: readonly TextEdit[];
}
export interface CodeEditorProposalIntent {
  readonly type: 'accept' | 'partial-accept' | 'dismiss';
  readonly proposalId: string;
  readonly proposalVersion: string;
  readonly target: DocumentIdentity;
  /** Original, zero-based edit indices. */
  readonly editIndices: readonly number[];
  /** UTF-16 prefix length for one insertion completion; never splits Unicode or CRLF. */
  readonly acceptedPrefix?: number;
  readonly edits: readonly TextEdit[];
}
export interface CodeEditorProps {
  readonly document: DocumentSnapshot;
  /** Controlled when supplied; otherwise CodeMirror owns transient cursor/focus only. */
  readonly selection?: CodeEditorSelection;
  /** Draft request. The host supplies the next snapshot, including its own revision. */
  readonly onChange?: (change: CodeEditorChange) => void;
  readonly onSelectionChange?: (change: CodeEditorSelectionChange) => void;
  readonly diagnostics?: readonly CodeEditorDiagnostic[];
  readonly proposal?: CodeEditorProposal;
  readonly commandState?: EditingCommandState;
  readonly onProposalIntent?: (intent: CodeEditorProposalIntent) => void;
  readonly onLookupOriginal?: (command: EditingCommand) => void;
  /** Host-declared receipt lookup activity; lookup may be repeated after a failed read. */
  readonly lookupPending?: boolean;
  readonly readOnly?: boolean;
  readonly status?: 'ready' | 'loading' | 'unsupported' | 'stale' | 'conflict' | 'error';
  readonly label?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
}
