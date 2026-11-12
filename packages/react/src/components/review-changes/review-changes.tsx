'use client';
import { useRef } from 'react';
import { Button } from '../button/button.js';
import { Accordion } from '../accordion/accordion.js';
import { CodeDiff } from '../code-diff/code-diff.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/agent-controls.module.css';
import a from '../../shared/styles/action-layout.module.css';
import { ScopedReviewChanges } from './scoped-review-changes.js';
import type {
  ReviewChangesContract,
  ReviewFileOperation,
  ProposedHunk,
} from './review-contract.js';
import { stateLabel } from '../../shared/labels.js';
export type {
  ReviewChangesContract,
  ReviewFileOperation,
  ProposedHunk,
  ReviewHunkSelection,
  ReviewFileSelection,
  ReviewCommand,
  ReviewFileOutcome,
  ReviewReceipt,
  ReviewSubmissionState,
  ReviewPolicy,
} from './review-contract.js';

export interface ProposedChange {
  id: string;
  path: string;
  before: string;
  after: string;
  conflict?: boolean;
  operation?: ReviewFileOperation;
  target?: import('@stackunseen/ui-core/editing').VersionedTextTarget;
  hunks?: readonly ProposedHunk[];
}

export interface ReviewChangesProps extends VariantProps<'ReviewChanges'> {
  changes: readonly ProposedChange[];
  baseVersion: string;
  proposalVersion: string;
  selectedIds: readonly string[];
  onSelectionChange: (ids: string[]) => void;
  state: 'ready' | 'pending' | 'accepted' | 'rejected' | 'stale' | 'error';
  error?: string;
  /** Opt-in exact scopes and host acknowledgements; legacy callbacks remain compatible. */
  review?: ReviewChangesContract;
  onDecision: (request: {
    baseVersion: string;
    proposalVersion: string;
    ids: string[];
    decision: 'accept' | 'reject';
  }) => void;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}

export function ReviewChanges(props: ReviewChangesProps) {
  return props.review ? (
    <ScopedReviewChanges {...props} review={props.review} />
  ) : (
    <LegacyReviewChanges {...props} />
  );
}

function LegacyReviewChanges({
  changes,
  baseVersion,
  proposalVersion,
  selectedIds,
  onSelectionChange,
  state,
  error,
  onDecision,
  variant = 'accordion',
  className = '',
}: ReviewChangesProps) {
  const submitted = useRef(new Set<string>());
  const oversized = changes.length > 50;
  const preview = changes.slice(0, 50);
  const unique = preview.length === new Set(preview.map((change) => change.id)).size;
  const selectionValid =
    selectedIds.length === new Set(selectedIds).size &&
    selectedIds.every((id) => preview.some((change) => change.id === id));
  const locked =
    !['ready', 'error'].includes(state) ||
    !baseVersion.trim() ||
    !proposalVersion.trim() ||
    !unique ||
    oversized ||
    !selectionValid ||
    preview.some((change) => !change.id.trim());
  const selected = preview.filter((change) => selectedIds.includes(change.id));
  function decide(decision: 'accept' | 'reject') {
    const key = JSON.stringify([baseVersion, proposalVersion]);
    if (
      locked ||
      submitted.current.has(key) ||
      submitted.current.size >= 100 ||
      (decision === 'accept' && (!selected.length || selected.some((change) => change.conflict)))
    )
      return;
    submitted.current.add(key);
    onDecision({
      baseVersion,
      proposalVersion,
      ids: (decision === 'accept' ? selected : changes).map((change) => change.id),
      decision,
    });
  }
  function content(change: ProposedChange) {
    return (
      <div className={s.root}>
        <label className={s.choice}>
          <input
            type="checkbox"
            checked={selectedIds.includes(change.id)}
            disabled={locked || change.conflict}
            onChange={(event) =>
              onSelectionChange(
                event.target.checked
                  ? [...selectedIds.filter((id) => id !== change.id), change.id]
                  : selectedIds.filter((id) => id !== change.id),
              )
            }
          />
          <span>Include {change.path}</span>
        </label>
        <CodeDiff
          path={change.path}
          before={change.before}
          after={change.after}
          baseVersion={baseVersion}
          nextVersion={proposalVersion}
          status={change.conflict ? 'conflict' : 'ready'}
          variant={variant === 'compact' ? 'compact' : 'unified'}
        />
      </div>
    );
  }
  return (
    <div className={`${s.root} ${className}`} data-part="review-changes" data-variant={variant}>
      <div className={s.header}>
        <strong>Review changes</strong>
        <span role="status" className={s.tag}>
          {stateLabel(state)}
        </span>
      </div>
      {!changes.length ? (
        <p className={s.muted}>No changes to review.</p>
      ) : variant === 'accordion' ? (
        <Accordion
          type="multiple"
          items={changes.slice(0, 50).map((change) => ({
            value: change.id,
            title: `${change.path}${change.conflict ? ' · Conflict' : ''}`,
            content: content(change),
          }))}
        />
      ) : (
        <div className={s.options}>
          {changes.slice(0, 50).map((change) => (
            <div key={change.id}>{content(change)}</div>
          ))}
        </div>
      )}
      {state === 'stale' && (
        <p role="status" className={s.warning}>
          The base version changed. Refresh this proposal.
        </p>
      )}
      {oversized && (
        <p role="status" className={s.warning}>
          This proposal exceeds the 50-change review limit. Only the first 50 changes are shown.
          Request a smaller proposal before making a decision.
        </p>
      )}
      {!unique && (
        <p role="alert" className={s.error}>
          Change identifiers are ambiguous.
        </p>
      )}
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      <div className={a.footer} role="group" aria-label="Change review decision">
        <Button
          variant="outline"
          disabled={locked || !changes.length}
          onClick={() => decide('reject')}
        >
          Reject proposal
        </Button>
        <Button
          disabled={locked || !selected.length || selected.some((change) => change.conflict)}
          onClick={() => decide('accept')}
        >
          Accept selected changes
        </Button>
      </div>
    </div>
  );
}
