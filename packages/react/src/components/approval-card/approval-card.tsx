'use client';
import { useEffect, useState } from 'react';
import type { ApprovalProposal, SubmissionState } from '@ai-interaction/core';
import { Button } from '../button/button.js';
import { Panel } from '../panel/panel.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import { AIIcon } from '../../providers/icons/icons.js';
import { SummaryHeading } from '../../shared/summary-heading.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import a from '../../shared/styles/action-layout.module.css';

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
      const remaining = Date.parse(proposal.expiresAt) - Date.now();
      const ended = !Number.isFinite(remaining) || remaining <= 0;
      setClockExpired(ended);
      if (!ended) timer = setTimeout(update, Math.min(remaining, 2_147_483_647));
    }
    update();
    return () => clearTimeout(timer);
  }, [proposal.expiresAt, proposal.id, proposal.version]);
  const hasExpired = expired ?? clockExpired;
  const unavailable =
    proposal.status !== 'pending' ||
    stale ||
    hasExpired ||
    ['submitting', 'acknowledged', 'outcome-unknown'].includes(submission);
  return (
    <Panel data-part="approval" data-variant={variant} className={s.approval}>
      <div className={s.row}>
        <SummaryHeading
          icon={
            <span className={s.reviewIcon} aria-hidden="true">
              <AIIcon name="warning" />
            </span>
          }
        >
          Review required
        </SummaryHeading>
        <StatusBadge
          state={
            stale
              ? 'superseded'
              : hasExpired && proposal.status === 'pending'
                ? 'expired'
                : proposal.status
          }
        />
      </div>
      <h3 className={s.title}>{proposal.title}</h3>
      <dl className={s.definition}>
        <dt>Affected system</dt>
        <dd>{proposal.target}</dd>
        <dt>Impact</dt>
        <dd>{proposal.impact}</dd>
        <dt>Requested scope</dt>
        <dd>{proposal.scopes.join(', ') || 'No scopes supplied'}</dd>
        <dt>Risk / version</dt>
        <dd>
          {proposal.risk} · v{proposal.version}
        </dd>
        <dt>Expires</dt>
        <dd>
          <time dateTime={proposal.expiresAt}>{proposal.expiresAt}</time>
        </dd>
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
          <p className={s.muted} role="status">
            {submission === 'submitting'
              ? 'Sending decision…'
              : submission === 'acknowledged'
                ? 'Decision acknowledged. Execution is reported separately.'
                : 'The host verifies permission and the current proposal before execution.'}
          </p>
        </>
      )}
    </Panel>
  );
}
