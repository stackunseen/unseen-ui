'use client';
import { Button } from '../button/button.js';
import { Accordion } from '../accordion/accordion.js';
import { CodeDiff } from '../code-diff/code-diff.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/agent-controls.module.css';
import a from '../../shared/styles/action-layout.module.css';

export interface ProposedChange {
  id: string;
  path: string;
  before: string;
  after: string;
  conflict?: boolean;
}

export interface ReviewChangesProps extends VariantProps<'ReviewChanges'> {
  changes: readonly ProposedChange[];
  baseVersion: string;
  proposalVersion: string;
  selectedIds: readonly string[];
  onSelectionChange: (ids: string[]) => void;
  state: 'ready' | 'pending' | 'accepted' | 'rejected' | 'stale' | 'error';
  error?: string;
  onDecision: (request: {
    baseVersion: string;
    proposalVersion: string;
    ids: string[];
    decision: 'accept' | 'reject';
  }) => void;
}

export function ReviewChanges({
  changes,
  baseVersion,
  proposalVersion,
  selectedIds,
  onSelectionChange,
  state,
  error,
  onDecision,
  variant = 'accordion',
}: ReviewChangesProps) {
  const oversized = changes.length > 50;
  const preview = changes.slice(0, 50);
  const unique = preview.length === new Set(preview.map((change) => change.id)).size;
  const locked =
    !['ready', 'error'].includes(state) || !baseVersion || !proposalVersion || !unique || oversized;
  const selected = preview.filter((change) => selectedIds.includes(change.id));
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
    <div className={s.root} data-part="review-changes" data-variant={variant}>
      <div className={s.header}>
        <strong>Review changes</strong>
        <span role="status" className={s.tag}>
          {state}
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
          onClick={() =>
            onDecision({
              baseVersion,
              proposalVersion,
              ids: changes.map((change) => change.id),
              decision: 'reject',
            })
          }
        >
          Reject proposal
        </Button>
        <Button
          disabled={locked || !selected.length || selected.some((change) => change.conflict)}
          onClick={() =>
            onDecision({
              baseVersion,
              proposalVersion,
              ids: selected.map((change) => change.id),
              decision: 'accept',
            })
          }
        >
          Accept selected changes
        </Button>
      </div>
    </div>
  );
}
