import type {
  DocumentIdentity,
  EditingCommand,
  TextRange,
  VersionedTextTarget,
} from '@stackunseen/ui-core/editing';

/** Add targets identify the host's immutable absence/tombstone revision. */
export type ReviewFileOperation =
  | { readonly kind: 'add' | 'modify' | 'delete' }
  | { readonly kind: 'rename'; readonly fromPath: string };

export interface ProposedHunk {
  readonly id: string;
  readonly label?: string;
  readonly target: VersionedTextTarget & { readonly range: TextRange };
  readonly insert: string;
}

export interface ReviewHunkSelection {
  readonly changeId: string;
  readonly hunkIds: readonly string[];
}

export interface ReviewFileSelection {
  readonly id: string;
  readonly target: VersionedTextTarget;
  /** Omitted means the whole file operation. Empty arrays are never executable. */
  readonly hunkIds?: readonly string[];
}

/** The host creates command IDs and authorizes the exact scope again on submission. */
export interface ReviewCommand extends EditingCommand {
  readonly baseVersion: string;
  readonly proposalVersion: string;
  readonly action: 'apply' | 'discard' | 'undo';
  readonly files: readonly ReviewFileSelection[];
  /** Required for undo: the original acknowledged saved command. */
  readonly undoOf?: string;
}

export type ReviewFileOutcome = ReviewFileSelection &
  (
    | { readonly result: 'applied'; readonly nextVersion: string }
    | { readonly result: 'rejected'; readonly reason: string }
    | { readonly result: 'unknown' }
  );

export interface ReviewReceipt {
  readonly command: ReviewCommand;
  /** Exactly one outcome per requested file; omitted outcomes remain unknown. */
  readonly files: readonly ReviewFileOutcome[];
}

export type ReviewSubmissionState =
  | { readonly status: 'idle' }
  | { readonly status: 'pending' | 'unknown'; readonly command: ReviewCommand }
  | {
      readonly status: 'settled';
      readonly command: ReviewCommand;
      readonly receipt: ReviewReceipt;
    };

export type ReviewPolicy =
  | { readonly stage: 'pending' }
  | {
      readonly stage: 'saved';
      readonly commandId: string;
      readonly targets: readonly VersionedTextTarget[];
      readonly undo: 'available' | 'unavailable';
      readonly reason?: string;
    };

export interface ReviewChangesContract {
  readonly proposal: DocumentIdentity;
  /** Current host-issued document identities, including absence revisions for adds. */
  readonly currentTargets: readonly DocumentIdentity[];
  readonly policy: ReviewPolicy;
  readonly access: 'allowed' | 'denied' | 'revoked';
  readonly submission: ReviewSubmissionState;
  readonly commands: Partial<Record<ReviewCommand['action'], ReviewCommand>>;
  readonly selectedHunks: readonly ReviewHunkSelection[];
  readonly onHunkSelectionChange: (selection: ReviewHunkSelection[]) => void;
  readonly onCommand: (command: ReviewCommand) => void;
  /** Persisted host history prevents replay after remount. Current-mount events are also guarded. */
  readonly completedCommandIds?: readonly string[];
  readonly lookup?: {
    readonly requestId: string;
    readonly status: 'ready' | 'pending';
    readonly onRequest: (original: ReviewCommand) => void;
  };
}
