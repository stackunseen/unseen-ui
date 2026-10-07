'use client';
import { Button } from '../button/button.js';
import type { VariantProps } from '../../shared/variants.js';
import {
  inspectHandoffCommand,
  inspectHandoffReceipt,
  inspectHandoffSnapshot,
  inspectHandoffSubmission,
  validateHandoffDecision,
} from './handoff-model.js';
import type {
  HandoffDecisionCommand,
  HandoffSnapshot,
  HandoffSubmission,
} from './handoff-model.js';
import { receiptMessage } from '../../shared/decision-contracts.js';
import { useDecisionExpiry } from '../../shared/decision-expiry.js';
import s from '../../shared/styles/agent-controls.module.css';
import a from '../../shared/styles/action-layout.module.css';
import { ObservationTime } from '../../shared/observation-time/observation-time.js';
import d from '../../shared/styles/styles.module.css';

export interface ScopedAgentHandoffProps extends VariantProps<'AgentHandoff'> {
  value: HandoffSnapshot;
  commandId: string;
  submission: HandoffSubmission;
  onDecision: (command: HandoffDecisionCommand) => void;
  /** Exact historical lookup, even when current context/access/ownership changed. */
  onReconcile?: (original: HandoffDecisionCommand) => void;
  reconciling?: boolean;
}
export function ScopedAgentHandoff({
  value: input,
  commandId,
  submission: inputSubmission,
  onDecision,
  onReconcile,
  reconciling = false,
  variant = 'card',
}: ScopedAgentHandoffProps) {
  const value = inspectHandoffSnapshot(input);
  const submission = inspectHandoffSubmission(inputSubmission);
  const expiry = useDecisionExpiry(value?.target.expiresAt);
  const original = submission && submission.state !== 'idle' ? submission.original : undefined;
  const suppliedReceipt =
    submission && submission.state !== 'idle' ? submission.receipt : undefined;
  const receipt =
    original && suppliedReceipt ? inspectHandoffReceipt(original, suppliedReceipt) : undefined;
  const invalidReceipt = !!suppliedReceipt && !receipt;
  const command = value
    ? inspectHandoffCommand({ commandId, target: value.target, decision: 'accept' })
    : undefined;
  const canDecide =
    submission?.state === 'idle' &&
    !reconciling &&
    !expiry.expired &&
    validateHandoffDecision(value, command, expiry.now ?? NaN);
  const contextAvailable =
    value?.access.state === 'available' && !['denied', 'revoked', 'unknown'].includes(value.status);
  const ownerMatches =
    value?.ownership.state === 'acknowledged' &&
    value.ownership.ownerId === value.target.from &&
    value.ownership.version === value.target.ownershipVersion;
  function decide(decision: HandoffDecisionCommand['decision']) {
    const current = value && inspectHandoffCommand({ commandId, target: value.target, decision });
    if (canDecide && current && validateHandoffDecision(value, current, Date.now()))
      onDecision(current);
  }
  return (
    <div
      className={`${s.root} ${variant === 'card' ? s.surface : ''}`}
      data-part="agent-handoff"
      data-variant={variant}
    >
      {value ? (
        <>
          <div className={s.header}>
            <strong>
              {value.target.from} → {value.target.to}
            </strong>
            <span role="status" className={s.tag}>
              {value.status} · {value.freshness}
            </span>
          </div>
          <p>Requested recipient: {value.target.to}</p>
          {value.ownership.state === 'acknowledged' ? (
            <>
              <p>
                {value.freshness === 'current' ? 'Current owner' : 'Last acknowledged owner'}:{' '}
                {value.ownership.ownerId}
              </p>
            </>
          ) : (
            <p className={s.warning}>Current owner: unknown. The host must confirm ownership.</p>
          )}
          {contextAvailable ? (
            <>
              <p>{value.summary || 'No public context summary supplied.'}</p>
            </>
          ) : (
            <p className={s.warning}>
              Handoff context is not accessible. Access is {value.access.state}.
            </p>
          )}
          <dl className={d.definition}>
            <dt>Request</dt>
            <dd>
              {value.target.handoffId} · Version {value.target.version} · Snapshot{' '}
              {value.target.snapshotVersion}
            </dd>
            <dt>Requested scope</dt>
            <dd>{value.target.scopes.join(', ')}</dd>
            {value.ownership.state === 'acknowledged' && (
              <>
                <dt>Ownership</dt>
                <dd>
                  {value.ownership.version} · Acknowledged by {value.ownership.acknowledged.by} at{' '}
                  <ObservationTime value={value.ownership.acknowledged.at} />
                </dd>
              </>
            )}
            {contextAvailable && (
              <>
                <dt>Context</dt>
                <dd>
                  {value.target.context.id} · Version {value.target.context.version} · Source{' '}
                  {value.target.context.sourceId} ({value.target.context.sourceVersion}) · Provided
                  by {value.target.context.providedBy}
                </dd>
              </>
            )}
            <dt>Recipient access</dt>
            <dd>
              {value.access.state} · Version {value.access.version} · Checked by{' '}
              {value.access.checkedBy} at <ObservationTime value={value.access.checkedAt} />
            </dd>
          </dl>
          <p className={s.muted}>
            A handoff does not grant permissions or approve pending actions.
          </p>
          {value.freshness !== 'current' && (
            <p className={s.warning}>
              This handoff is {value.freshness}. Refresh the host snapshot before deciding.
            </p>
          )}
          {expiry.expired && (
            <p className={s.warning}>This handoff has expired. Request a current handoff.</p>
          )}
          {!ownerMatches && value.status === 'requested' && (
            <p className={s.warning}>
              Ownership is unknown or changed. The host must issue a current handoff.
            </p>
          )}
          {value.status === 'accepted' &&
            value.ownership.state === 'acknowledged' &&
            value.ownership.ownerId !== value.target.to && (
              <p className={s.warning}>
                Acceptance does not establish current ownership. The last acknowledged owner is
                shown above.
              </p>
            )}
        </>
      ) : (
        <p role="alert" className={s.error}>
          The host must provide a valid handoff, context provenance and recipient access record
          before you can decide.
        </p>
      )}
      {!submission && (
        <p role="alert" className={s.error}>
          Decision status is invalid or unavailable. Check the original handoff decision with the
          host.
        </p>
      )}
      {!command && value && <p className={s.warning}>A new decision identity is unavailable.</p>}
      {original && (
        <div role="status">
          <p className={s.muted}>
            Original decision {original.commandId} · Handoff {original.target.handoffId} · Version{' '}
            {original.target.version}
          </p>
          <p className={s.warning}>
            {invalidReceipt
              ? 'The receipt does not match the exact original handoff decision. Its outcome is still unknown.'
              : submission?.state === 'submitting' && !receipt
                ? 'Sending handoff decision. Ownership has not been transferred.'
                : receiptMessage(receipt?.outcome)}
          </p>
        </div>
      )}
      <div className={a.footer} role="group" aria-label="Handoff decision">
        <Button variant="outline" disabled={!canDecide} onClick={() => decide('decline')}>
          Decline handoff
        </Button>
        <Button disabled={!canDecide} onClick={() => decide('accept')}>
          Accept handoff
        </Button>
      </div>
      {original &&
        onReconcile &&
        (invalidReceipt ||
          !receipt ||
          ['accepted', 'unknown', 'not-found'].includes(receipt.outcome)) && (
          <div className={a.footer} role="group" aria-label="Handoff recovery">
            <Button
              size="sm"
              variant="outline"
              disabled={reconciling || submission?.state === 'submitting'}
              onClick={() => onReconcile(original)}
            >
              {reconciling ? 'Checking original handoff…' : 'Check original handoff'}
            </Button>
          </div>
        )}
    </div>
  );
}
