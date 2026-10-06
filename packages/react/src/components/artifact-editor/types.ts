import type { ReactNode } from 'react';
import type {
  DocumentIdentity,
  DocumentSnapshot,
  EditingCommand,
  EditingCommandState,
} from '@stackunseen/ui-core/editing';

/** The host issues a new draft version whenever its text changes. */
export interface ArtifactDraft extends DocumentSnapshot {
  readonly base: DocumentIdentity;
}

export interface ArtifactDraftChange {
  readonly target: DocumentIdentity;
  readonly text: string;
}

export interface ArtifactSaveIntent extends EditingCommand {
  readonly kind: 'save';
  readonly base: DocumentIdentity;
  readonly text: string;
}

export interface ArtifactExportIntent extends EditingCommand {
  readonly kind: 'export';
  readonly document: DocumentSnapshot;
}

export interface ArtifactReceiptLookup extends EditingCommand {
  readonly kind: 'save' | 'export';
}

/** Compose an optional editor without making its runtime a dependency of this entry. */
export interface ArtifactEditorInputProps {
  readonly document: DocumentSnapshot;
  readonly label: string;
  readonly readOnly: boolean;
  readonly onDocumentChange: (change: ArtifactDraftChange) => void;
}

export type ArtifactEditorView = 'preview' | 'edit' | 'diff';

export interface ArtifactEditorProps {
  readonly document: DocumentSnapshot;
  readonly draft: ArtifactDraft;
  readonly label?: string;
  readonly view?: ArtifactEditorView;
  readonly onViewChange?: (view: ArtifactEditorView) => void;
  readonly onDraftChange?: (change: ArtifactDraftChange) => void;
  readonly access?: 'available' | 'read-only' | 'revoked';
  readonly loading?: boolean;
  readonly error?: string;
  /** Host-issued command for the exact current draft; a click never creates a command ID. */
  readonly saveCommand?: EditingCommand;
  readonly saveState?: EditingCommandState;
  readonly onSave?: (intent: ArtifactSaveIntent) => void;
  readonly exportCommand?: EditingCommand;
  readonly exportState?: EditingCommandState;
  readonly onExport?: (intent: ArtifactExportIntent) => void;
  /** Look up the original command after a lost acknowledgement; never replay it. */
  readonly onLookupReceipt?: (command: ArtifactReceiptLookup) => void;
  readonly receiptLookupPending?: boolean;
  readonly renderEditor?: (props: ArtifactEditorInputProps) => ReactNode;
  readonly className?: string;
}
