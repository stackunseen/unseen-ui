import { useRef } from 'react';
import { Accordion, Button, StatusBadge } from '@stackunseen/ui';
import { canExecute, type ActionEvent, type ActionHost } from './action-host';
import s from './actions.module.css';

export function ExecutionReceiptView({
  host,
  send,
}: {
  host: ActionHost;
  send: (event: ActionEvent) => void;
}) {
  const record = host.decision;
  const receiptRef = useRef<HTMLDivElement>(null);
  const deliver = (event: ActionEvent) => {
    send(event);
    requestAnimationFrame(() => receiptRef.current?.focus());
  };
  return (
    <div
      className={s.receipt}
      ref={receiptRef}
      tabIndex={-1}
      role="group"
      aria-label="Command receipts"
    >
      <h3>Command and execution receipts</h3>
      {record.state !== 'idle' && (
        <>
          <p>
            Decision receipt: <strong>{record.receipt?.outcome ?? 'not received'}</strong>
          </p>
          {record.receipt?.outcome === 'accepted' && (
            <p>Decision accepted. Execution has a separate result.</p>
          )}
          <Accordion
            type="single"
            collapsible
            headingLevel={4}
            items={[
              {
                value: 'original',
                title: 'Inspect exact original binding',
                content: (
                  <dl className={s.binding}>
                    <dt>Original command</dt>
                    <dd>{record.original.commandId}</dd>
                    <dt>Reviewer</dt>
                    <dd>{record.original.payload.subjectId}</dd>
                    <dt>Workspace / run</dt>
                    <dd>
                      {record.original.scope.workspaceId} / {record.original.scope.runId}
                    </dd>
                    <dt>Attempt / run version</dt>
                    <dd>
                      {record.original.scope.attemptId} / {record.original.expectedRunVersion}
                    </dd>
                    <dt>Proposal / version</dt>
                    <dd>
                      {record.original.payload.proposalId} / {record.original.payload.version}
                    </dd>
                    <dt>Action binding</dt>
                    <dd>{record.original.payload.actionDigest} (fixture identifier)</dd>
                    <dt>Resource / revision</dt>
                    <dd>
                      {record.original.payload.resource} / {record.original.payload.resourceVersion}
                    </dd>
                    <dt>Scope / access revision</dt>
                    <dd>
                      {record.original.payload.scopes.join(', ')} /{' '}
                      {record.original.payload.accessVersion}
                    </dd>
                    {host.result && (
                      <>
                        <dt>Execution acknowledgement</dt>
                        <dd>
                          {host.result.acknowledged.by} · {host.result.acknowledged.at}
                        </dd>
                      </>
                    )}
                    <dt>Expiry</dt>
                    <dd>{record.original.payload.expiresAt}</dd>
                  </dl>
                ),
              },
            ]}
          />
        </>
      )}
      {!host.result ? (
        <p>
          {host.tool.state === 'outcome-unknown'
            ? 'Execution outcome unknown. Look up the original receipt.'
            : record.state === 'idle'
              ? host.permission.status === 'granted'
                ? 'Waiting for an action decision.'
                : 'Waiting for an access grant and action decision.'
              : 'No execution receipt received.'}
        </p>
      ) : (
        <>
          <StatusBadge state={host.result.outcome === 'succeeded' ? 'succeeded' : 'failed'} />
          <p>
            {host.result.outcome === 'partial-failure'
              ? 'Partial failure: applied effects remain recorded.'
              : 'Both account changes confirmed by the simulated server.'}
          </p>
          <ul className={s.effects} aria-label="Server-confirmed account effects">
            {host.result.effects.map((effect) => (
              <li key={effect.resource}>
                <strong>
                  {effect.resource}: {effect.outcome}
                </strong>
                <span>{effect.detail}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className={s.buttons} role="group" aria-label="Server execution events">
        <Button size="sm" disabled={!canExecute(host)} onClick={() => send({ type: 'execute' })}>
          Start simulated execution
        </Button>
        {host.tool.state === 'running' && (
          <Button size="sm" variant="outline" onClick={() => deliver({ type: 'finish' })}>
            Complete execution
          </Button>
        )}
        {host.tool.state === 'outcome-unknown' && (
          <Button size="sm" variant="outline" onClick={() => deliver({ type: 'lookup-result' })}>
            Look up original execution receipt
          </Button>
        )}
      </div>
      <p className={s.boundary}>
        Simulated executions: <strong>{host.executions}</strong>
      </p>
    </div>
  );
}
