'use client';
import { useId } from 'react';
import type { ApprovalProposal, CommandReceipt, SubmissionState } from '@stackunseen/ui-core';
import { validateApprovalDecision } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { Checkbox } from '../checkbox/checkbox.js';
import { ChipGroup } from '../chip/chip.js';
import { Tag } from '../tag/tag.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import g from './governance.module.css';
import { stateLabel } from '../../shared/labels.js';

export interface ApprovalBatchItem {
  proposalId: string;
  version: number;
  actionDigest: string;
}
export interface ApprovalBatchDecision {
  decision: 'approve' | 'reject';
  /** Exactly the proposals covered, by id, version and digest. */
  items: ApprovalBatchItem[];
}
export interface ApprovalBatchProps extends VariantProps<'ApprovalBatch'> {
  proposals: readonly ApprovalProposal[];
  /** Proposals the person pulled out of the batch; they stay listed but are not covered. */
  excludedIds: readonly string[];
  onExcludedChange: (ids: string[]) => void;
  onDecision: (decision: ApprovalBatchDecision) => void;
  submission?: SubmissionState;
  /** The host's receipt; `covered` lists the proposal ids the host actually applied the decision to. */
  receipt?: CommandReceipt & { covered?: readonly string[] };
  /** The host clock, for expiry. */
  now?: string;
  label?: string;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}

/** Several same-scope proposals under one acknowledged decision, each one still opt-out-able. */
export function ApprovalBatch({
  variant = 'card',
  proposals,
  excludedIds,
  onExcludedChange,
  onDecision,
  submission = 'idle',
  receipt,
  now,
  label = 'Approve together',
  className = '',
}: ApprovalBatchProps) {
  const id = useId();
  const clock = now ? Date.parse(now) : Date.now();
  const excluded = new Set(excludedIds);
  const scopes = new Set(proposals.flatMap((proposal) => proposal.scopes));
  const targets = new Set(proposals.map((proposal) => proposal.target));
  const sameScope =
    targets.size <= 1 &&
    proposals.every(
      (proposal) =>
        proposal.scopes.length === scopes.size &&
        proposal.scopes.every((scope) => scopes.has(scope)),
    );
  const decidable = proposals.filter(
    (proposal) =>
      !excluded.has(proposal.id) &&
      validateApprovalDecision(
        proposal,
        {
          commandId: 'batch',
          proposalId: proposal.id,
          version: proposal.version,
          actionDigest: proposal.actionDigest,
          decision: 'approve',
        },
        clock,
      ).ok,
  );
  const dropped = proposals.filter(
    (proposal) => proposal.status !== 'pending' || Date.parse(proposal.expiresAt) <= clock,
  );
  const locked = submission !== 'idle' || !sameScope;
  const covered = new Set(receipt?.covered ?? []);
  const decide = (decision: 'approve' | 'reject') =>
    onDecision({
      decision,
      items: decidable.map((proposal) => ({
        proposalId: proposal.id,
        version: proposal.version,
        actionDigest: proposal.actionDigest,
      })),
    });
  const toggle = (proposalId: string) => {
    const next = new Set(excluded);
    if (next.has(proposalId)) next.delete(proposalId);
    else next.add(proposalId);
    onExcludedChange([...next]);
  };
  return (
    <section
      className={`${variant === 'card' ? s.panel : ''} ${g.root} ${className}`}
      data-part="approval-batch"
      data-variant={variant}
      aria-labelledby={`${id}-title`}
    >
      <div className={g.grantHead}>
        <h3 id={`${id}-title`} className={g.title}>
          {label}
          <span className={g.count}>{decidable.length}</span>
        </h3>
        <StatusBadge
          state={
            submission === 'idle'
              ? 'pending'
              : submission === 'acknowledged'
                ? 'succeeded'
                : submission === 'failed'
                  ? 'failed'
                  : submission === 'outcome-unknown'
                    ? 'outcome-unknown'
                    : 'running'
          }
          label={
            submission === 'idle'
              ? 'Needs review'
              : submission === 'submitting'
                ? 'Sending'
                : submission === 'acknowledged'
                  ? 'Confirmed'
                  : submission === 'failed'
                    ? 'Failed'
                    : 'Outcome unknown'
          }
        />
      </div>
      {proposals.length > 0 && (
        <p className={s.muted}>
          {targets.size === 1 ? `Target: ${[...targets][0]}.` : 'Different targets.'}{' '}
          <ChipGroup label="Scopes" className={g.inlineChips}>
            {[...scopes].map((scope) => (
              <Tag key={scope} size="sm">
                {scope}
              </Tag>
            ))}
          </ChipGroup>
        </p>
      )}
      {!sameScope && (
        <p className={g.warn} role="status">
          These proposals do not share one target and scope, so they cannot be decided together.
          Decide them one by one.
        </p>
      )}
      <ul className={g.list} aria-label="Proposals in this batch">
        {proposals.map((proposal) => {
          const isDropped = dropped.includes(proposal);
          const isExcluded = excluded.has(proposal.id);
          const wasCovered = covered.has(proposal.id);
          return (
            <li
              key={`${proposal.id}:${proposal.version}`}
              className={g.effect}
              data-excluded={isExcluded || undefined}
              data-dropped={isDropped || undefined}
            >
              <label className={g.effectRow}>
                <Checkbox
                  checked={!isExcluded && !isDropped}
                  disabled={locked || isDropped}
                  onCheckedChange={() => toggle(proposal.id)}
                  aria-label={`Include: ${proposal.title}`}
                />
                <span className={g.effectBody}>
                  <span className={g.effectLabel}>{proposal.title}</span>
                  <span className={g.meta}>
                    <span>{proposal.impact}</span>
                    <span>
                      {proposal.risk === 'unknown'
                        ? 'Risk not assessed'
                        : `${stateLabel(proposal.risk)} risk`}
                    </span>
                    <span>Version {proposal.version}</span>
                    {isDropped && (
                      <span className={g.warn}>
                        {proposal.status === 'pending' ? 'Expired' : `Already ${proposal.status}`};
                        left out of the batch
                      </span>
                    )}
                    {receipt && submission === 'acknowledged' && !isDropped && !isExcluded && (
                      <span className={wasCovered ? undefined : g.warn}>
                        {wasCovered
                          ? 'Included in the confirmation'
                          : 'Not included in the confirmation'}
                      </span>
                    )}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {receipt?.message && (
        <p className={s.muted} role="status">
          {receipt.message}
        </p>
      )}
      <div className={s.actions}>
        <Button
          size="sm"
          variant="outline"
          disabled={locked || decidable.length === 0}
          onClick={() => decide('reject')}
        >
          Reject {decidable.length}
        </Button>
        <Button
          size="sm"
          disabled={locked || decidable.length === 0}
          onClick={() => decide('approve')}
        >
          Approve {decidable.length}
        </Button>
      </div>
    </section>
  );
}
