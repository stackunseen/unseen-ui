'use client';
import { useRef, useState, useSyncExternalStore } from 'react';
import { Accordion, ApprovalCard, Button, PermissionRequest, ToolCall } from '@stackunseen/ui';
import {
  actionHostEvent,
  createActionHost,
  isReviewCurrent,
  type ActionEvent,
} from './action-host';
import { ActionControls } from './action-controls';
import { ExecutionReceiptView } from './execution-receipt';
import s from './actions.module.css';

// The mock host owns snapshots; React subscribes and renders controlled public components.
function createMockHost() {
  let snapshot = createActionHost();
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    send: (event: ActionEvent) => {
      const next = actionHostEvent(snapshot, event);
      if (next !== snapshot) {
        snapshot = next;
        listeners.forEach((listener) => listener());
      }
    },
    reset: () => {
      snapshot = createActionHost();
      listeners.forEach((listener) => listener());
    },
  };
}

export function ActionReceiptRecipe() {
  const [store] = useState(createMockHost);
  const host = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const approvalRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const stale = !isReviewCurrent(host);
  const expired = host.now >= Date.parse(host.current.proposal.expiresAt);
  const approved =
    host.decision.state === 'acknowledged' &&
    host.decision.original.payload.decision === 'approve' &&
    host.decision.receipt?.outcome === 'accepted';
  const proposal = {
    ...host.reviewed.proposal,
    status: approved
      ? ('approved' as const)
      : host.tool.state === 'denied'
        ? ('rejected' as const)
        : host.reviewed.proposal.status,
  };
  return (
    <section className={s.recipe} aria-label="Action receipts recipe">
      <header className={s.header}>
        <p className={s.boundary}>Simulated host · fixed local records · no live side effects</p>
        <Button size="sm" variant="outline" onClick={store.reset}>
          Start a new simulation
        </Button>
      </header>
      <p className={s.notice} role="status" aria-live="polite" aria-atomic="true">
        {host.notice}
      </p>
      <div className={s.columns}>
        <div
          className={s.review}
          ref={reviewRef}
          tabIndex={-1}
          role="group"
          aria-label="Action review"
        >
          <h2>Action review</h2>
          <p>
            Archive AC-104 and AC-108 in the demo CRM. Access grants and action approvals are
            separate decisions.
          </p>
          {host.permission.status === 'granted' ? (
            <div className={s.grant}>
              <p>
                <strong>Access granted:</strong> {host.permission.target.resource} ·{' '}
                {host.permission.target.scopes.join(', ')}
              </p>
              <p className={s.boundary}>
                {host.permission.freshness} snapshot · access {host.permission.target.accessVersion}{' '}
                · expires{' '}
                <time dateTime={host.permission.target.expiresAt}>
                  {host.permission.target.expiresAt.slice(0, 10)}
                </time>
              </p>
              <Accordion
                type="single"
                collapsible
                headingLevel={3}
                items={[
                  {
                    value: 'access',
                    title: 'Access decision details',
                    content: (
                      <PermissionRequest
                        value={host.permission}
                        commandId={`archive-permission-${host.permission.target.version}`}
                        submission={host.permissionSubmission}
                        variant="compact"
                        headingLevel={4}
                        onDecision={(original) =>
                          store.send({ type: 'permission-submit', original })
                        }
                      />
                    ),
                  },
                ]}
              />
            </div>
          ) : (
            <>
              <PermissionRequest
                value={host.permission}
                commandId={`archive-permission-${host.permission.target.version}`}
                submission={host.permissionSubmission}
                variant="compact"
                onDecision={(original) => store.send({ type: 'permission-submit', original })}
              />
              {host.permissionSubmission.state === 'submitting' && (
                <div className={s.buttons}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      store.send({ type: 'permission-accept' });
                      requestAnimationFrame(() => approvalRef.current?.focus());
                    }}
                  >
                    Confirm access decision
                  </Button>
                </div>
              )}
            </>
          )}
          {host.permission.status === 'granted' ? (
            <div ref={approvalRef} tabIndex={-1} role="group" aria-label="Action approval">
              <ApprovalCard
                proposal={proposal}
                submission={host.decision.state}
                stale={stale}
                expired={expired}
                error={host.decision.state === 'failed' ? host.decision.receipt?.detail : undefined}
                onDecision={(decision) =>
                  store.send({
                    type: 'decision-submit',
                    decision,
                    proposal: host.reviewed.proposal,
                  })
                }
                onReconcile={() => store.send({ type: 'lookup-decision' })}
              />
            </div>
          ) : (
            <p className={s.boundary}>
              The host must confirm the exact access before an action decision becomes available.
            </p>
          )}
          {host.decision.state === 'submitting' && (
            <div className={s.buttons} role="group" aria-label="Host decision acknowledgement">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  store.send({ type: 'decision-accept' });
                  requestAnimationFrame(() => approvalRef.current?.focus());
                }}
              >
                Accept decision
              </Button>
            </div>
          )}
          {stale && (
            <div className={s.grant}>
              <p className={s.warning}>
                Current host proposal: v{host.current.proposal.version}; run version{' '}
                {host.current.runVersion}; scope {host.current.proposal.scopes.join(', ')}; resource{' '}
                {host.current.resourceVersion}; access {host.current.accessVersion}. Review this
                replacement before deciding.
              </p>
              <div className={s.buttons}>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    host.executions !== 0 ||
                    (host.decision.state !== 'idle' && host.acceptedReceipt?.outcome !== 'rejected')
                  }
                  onClick={() => {
                    store.send({ type: 'review-current' });
                    requestAnimationFrame(() => reviewRef.current?.focus());
                  }}
                >
                  Review current action
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className={s.execution}>
          <h2>Execution record</h2>
          <ToolCall.Root value={host.tool} variant="compact" />
          <ExecutionReceiptView host={host} send={store.send} />
        </div>
      </div>
      <ActionControls host={host} send={store.send} />
      <p className={s.boundary}>
        A real host must validate the reviewer, scope, versions and expiry, retain the original
        commands, and prevent duplicate execution. Reloading clears this simulation.
      </p>
    </section>
  );
}
