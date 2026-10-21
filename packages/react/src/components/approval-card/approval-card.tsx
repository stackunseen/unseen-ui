'use client';
import { Fragment, useEffect, useState } from 'react';
import type { ApprovalProposal, SubmissionState } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { Panel } from '../panel/panel.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import a from '../../shared/styles/action-layout.module.css';
import { ObservationTime } from '../../shared/observation-time/observation-time.js';
import { useDisclosure } from '../../shared/disclosure.js';

export interface ApprovalCardProps extends VariantProps<'ApprovalCard'> {
  proposal: ApprovalProposal;
  submission: SubmissionState;
  stale?: boolean;
  expired?: boolean;
  error?: string;
  onDecision: (decision: 'approve' | 'reject', proposal: ApprovalProposal) => void;
  onReconcile?: () => void;
}

export function ApprovalCard({
  variant = 'card',
  proposal,
  submission,
  stale = false,
  expired,
  error,
  onDecision,
  onReconcile,
}: ApprovalCardProps) {
  const [clockExpired, setClockExpired] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function update() {
      // An empty expiry means the host set none; any other unreadable value fails closed.
      if (proposal.expiresAt === '') return setClockExpired(false);
      const remaining = Date.parse(proposal.expiresAt) - Date.now();
      const ended = !Number.isFinite(remaining) || remaining <= 0;
      setClockExpired(ended);
      if (!ended) timer = setTimeout(update, Math.min(remaining, 2_147_483_647));
    }
    update();
    return () => clearTimeout(timer);
  }, [proposal.expiresAt, proposal.id, proposal.version]);
  const hasExpired = expired ?? clockExpired;
  const details = useDisclosure({ defaultOpen: variant === 'split' });
  const unavailable =
    proposal.status !== 'pending' ||
    stale ||
    hasExpired ||
    ['submitting', 'acknowledged', 'outcome-unknown'].includes(submission);
  const status = stale
    ? 'superseded'
    : hasExpired && proposal.status === 'pending'
      ? 'expired'
      : proposal.status;
  // Once the host settles the decision, or the proposal can no longer be decided, the outcome
  // replaces the decision buttons.
  const decided = status !== 'pending' || submission === 'acknowledged';
  const summaryParts = [
    proposal.target,
    proposal.scopes.join(', '),
    proposal.risk === 'unknown' ? '' : `${proposal.risk} risk`,
  ].filter(Boolean);
  const heading = {
    pending: 'Review required',
    approved: 'Action approved',
    rejected: 'Action rejected',
    expired: 'Proposal expired',
    superseded: 'Proposal changed',
  }[status];
  return (
    <Panel data-part="approval" data-variant={variant} className={s.approval}>
      <div className={s.row}>
        <div className={s.approvalHeading}>
          <span className={s.reviewIcon} data-risk={proposal.risk} aria-hidden="true">
            <AIIcon name="warning" />
          </span>
          <div className={s.grow}>
            <span className={s.eyebrow}>{heading}</span>
            <h3 className={s.title}>{proposal.title}</h3>
          </div>
        </div>
        <StatusBadge state={status} />
      </div>
      {/* Only what the host supplied; unassessed risk and missing scopes are stated in Details. */}
      {summaryParts.length > 0 && (
        <p className={s.approvalSummary}>
          {summaryParts.map((part, index) => (
            <Fragment key={part}>
              {index > 0 && ' · '}
              <span>{part}</span>
            </Fragment>
          ))}
        </p>
      )}
      <p>{proposal.impact}</p>
      <dl className={s.definition} {...details.contentProps}>
        {/* Supplied scopes are in the summary line; say so here only when there are none. */}
        {proposal.scopes.length === 0 && (
          <>
            <dt>Scopes</dt>
            <dd>None supplied</dd>
          </>
        )}
        <dt>Risk / version</dt>
        <dd>
          {proposal.risk === 'unknown' ? 'Not assessed' : proposal.risk} · v{proposal.version}
        </dd>
        <dt>Expires</dt>
        <dd>
          {proposal.expiresAt ? <ObservationTime value={proposal.expiresAt} /> : 'None supplied'}
        </dd>
        <dt>Execution</dt>
        <dd>The host verifies permission and the current proposal before execution.</dd>
      </dl>
      {stale && (
        <p className={s.warning}>This proposal changed or is stale. Refresh before deciding.</p>
      )}
      {hasExpired && proposal.status === 'pending' && (
        <p className={s.warning}>This proposal has expired.</p>
      )}
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {submission === 'outcome-unknown' ? (
        <div role="status">
          <p className={s.warning}>
            Your decision may have reached the host. Check its status before trying again.
          </p>
          {onReconcile && (
            <div className={`${s.actions} ${a.footer}`} role="group" aria-label="Decision recovery">
              <Button size="sm" variant="outline" onClick={onReconcile}>
                Check decision status
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className={`${s.actions} ${a.footer}`} role="group" aria-label="Approval decision">
            <Button variant="ghost" size="sm" {...details.triggerProps}>
              {details.open ? 'Hide details' : 'Details'}
            </Button>
            {!decided && (
              <div className={a.decisions}>
                <Button
                  variant="outline"
                  disabled={unavailable}
                  onClick={() => onDecision('reject', proposal)}
                >
                  Reject
                </Button>
                <Button disabled={unavailable} onClick={() => onDecision('approve', proposal)}>
                  Approve action
                </Button>
              </div>
            )}
          </div>
          <p className={s.muted} role="status">
            {submission === 'submitting'
              ? 'Sending decision…'
              : submission === 'acknowledged'
                ? 'Decision acknowledged. Execution is reported separately.'
                : ''}
          </p>
        </>
      )}
    </Panel>
  );
}
