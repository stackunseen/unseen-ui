'use client';
import { Button } from '../button/button.js';
import { Panel } from '../panel/panel.js';
import type { VariantProps } from '../../shared/variants.js';
import {
  inspectPermissionCommand,
  inspectPermissionReceipt,
  inspectPermissionSnapshot,
  inspectPermissionSubmission,
  validatePermissionDecision,
} from './permission-model.js';
import type {
  PermissionDecisionCommand,
  PermissionSnapshot,
  PermissionSubmission,
} from './permission-model.js';
import { receiptMessage } from '../../shared/decision-contracts.js';
import { useDecisionExpiry } from '../../shared/decision-expiry.js';
import s from '../../shared/styles/styles.module.css';
import a from '../../shared/styles/action-layout.module.css';

export interface ScopedPermissionRequestProps extends VariantProps<'PermissionRequest'> {
  value: PermissionSnapshot;
  /** Host-allocated idempotency identity; retain it with the submitted command. */
  commandId: string;
  submission: PermissionSubmission;
  onDecision: (command: PermissionDecisionCommand) => void;
  /** Lookup only. Do not dispatch or regenerate the original command. */
  onReconcile?: (original: PermissionDecisionCommand) => void;
  reconciling?: boolean;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}
export function ScopedPermissionRequest({
  value: input,
  commandId,
  submission: inputSubmission,
  onDecision,
  onReconcile,
  reconciling = false,
  headingLevel = 3,
  variant = 'card',
}: ScopedPermissionRequestProps) {
  const value = inspectPermissionSnapshot(input);
  const submission = inspectPermissionSubmission(inputSubmission);
  const expiry = useDecisionExpiry(value?.target.expiresAt);
  const original = submission && submission.state !== 'idle' ? submission.original : undefined;
  const suppliedReceipt =
    submission && submission.state !== 'idle' ? submission.receipt : undefined;
  const receipt =
    original && suppliedReceipt ? inspectPermissionReceipt(original, suppliedReceipt) : undefined;
  const invalidReceipt = !!suppliedReceipt && !receipt;
  const command = value
    ? inspectPermissionCommand({ commandId, target: value.target, decision: 'allow' })
    : undefined;
  const canDecide =
    submission?.state === 'idle' &&
    !reconciling &&
    !expiry.expired &&
    validatePermissionDecision(value, command, expiry.now ?? NaN);
  const Heading = `h${headingLevel}` as const;
  function decide(decision: PermissionDecisionCommand['decision']) {
    const current =
      value && inspectPermissionCommand({ commandId, target: value.target, decision });
    if (canDecide && current && validatePermissionDecision(value, current, Date.now()))
      onDecision(current);
  }
  return (
    <Panel data-part="permission-request" data-variant={variant} className={s.permission}>
      <Heading className={s.title}>
        {value ? `Connect to ${value.target.resource}` : 'Connection access request'}
      </Heading>
      {value ? (
        <>
          <p>Requested access: {value.target.scopes.join(', ')}</p>
          <p className={s.muted}>
            For {value.target.subjectId} · Request {value.target.requestId} · Version{' '}
            {value.target.version}
          </p>
          <div role="status">
            Permission: {value.status}
            {value.freshness !== 'current' ? ` · ${value.freshness} snapshot` : ''}
          </div>
          <p className={s.muted}>Access permission does not approve later actions.</p>
          {value.grant && value.status === 'granted' && (
            <p>
              Host-confirmed grant {value.grant.id} · {value.grant.acknowledged.by} ·{' '}
              {value.grant.acknowledged.at}
            </p>
          )}
          {value.freshness !== 'current' && (
            <p className={s.warning}>
              Refresh the current request before deciding. The last reported permission may have
              changed.
            </p>
          )}
          {expiry.expired && (
            <p className={s.warning}>
              This request has expired. Ask the host for a current request.
            </p>
          )}
          <p className={s.muted}>
            Decision access: {value.access.state} · Checked by {value.access.checkedBy} at{' '}
            {value.access.checkedAt}
          </p>
          {value.access.state !== 'available' && (
            <p className={s.warning}>
              Decision access is {value.access.state}. The host must verify access before a new
              decision.
            </p>
          )}
          <p className={s.muted}>
            Expires: <time dateTime={value.target.expiresAt}>{value.target.expiresAt}</time>
          </p>
        </>
      ) : (
        <p role="alert" className={s.error}>
          The host must provide a valid, complete permission request and access record before you
          can decide.
        </p>
      )}
      {!submission && (
        <p role="alert" className={s.error}>
          Decision status is invalid or unavailable. Check the original decision with the host.
        </p>
      )}
      {!command && value && <p className={s.warning}>A new decision identity is unavailable.</p>}
      {original && (
        <div role="status">
          <p className={s.muted}>
            Original decision {original.commandId} · Request {original.target.requestId} · Version{' '}
            {original.target.version}
          </p>
          <p className={s.warning}>
            {invalidReceipt
              ? 'The receipt does not match the exact original decision. Its outcome is still unknown.'
              : submission?.state === 'submitting' && !receipt
                ? 'Sending permission decision. Access has not been confirmed.'
                : receiptMessage(receipt?.outcome)}
          </p>
        </div>
      )}
      <div className={`${s.actions} ${a.footer}`} role="group" aria-label="Permission decision">
        <Button variant="outline" disabled={!canDecide} onClick={() => decide('deny')}>
          Deny access
        </Button>
        <Button disabled={!canDecide} onClick={() => decide('allow')}>
          Allow access
        </Button>
      </div>
      {original &&
        onReconcile &&
        (invalidReceipt ||
          !receipt ||
          ['accepted', 'unknown', 'not-found'].includes(receipt.outcome)) && (
          <div className={`${s.actions} ${a.footer}`} role="group" aria-label="Permission recovery">
            <Button
              size="sm"
              variant="outline"
              disabled={reconciling || submission?.state === 'submitting'}
              onClick={() => onReconcile(original)}
            >
              {reconciling ? 'Checking original decision…' : 'Check original decision'}
            </Button>
          </div>
        )}
    </Panel>
  );
}
