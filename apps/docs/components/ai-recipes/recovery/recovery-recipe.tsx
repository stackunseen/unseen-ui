'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Accordion, Button, ConnectionStatus, PromptInput, StatusBadge } from '@stackunseen/ui';
import { createRecoveryHost } from './recovery-host';
import type { RecoveryHost } from './recovery-host';
import { RecoveryControls } from './recovery-controls';
import { RecoveryTranscript } from './recovery-transcript';
import s from './recovery.module.css';

/** No props: a disposable local recipe; the route supplies its surrounding site theme. */
export function RecoveryRecipe() {
  const [host, setHost] = useState<RecoveryHost>();
  useEffect(() => {
    const next = createRecoveryHost();
    setHost(next);
    return () => next.dispose();
  }, []);
  return host ? (
    <RecoveryWorkspace host={host} />
  ) : (
    <p role="status">Preparing simulated recovery server.</p>
  );
}

function RecoveryWorkspace({ host }: { host: RecoveryHost }) {
  const state = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getSnapshot);
  const receiptRef = useRef<HTMLDivElement>(null);
  const latest = state.commands.at(-1);
  const active = ['running', 'queued'].includes(state.runtime.run.lifecycle);
  const ready = host.available();
  const current =
    state.connection.state === 'connected' && state.connection.freshness === 'current';
  const reason = !current
    ? 'Reconnect and receive a current snapshot. Your draft stays editable.'
    : !ready
      ? 'Resolve or apply the original request before sending another.'
      : active
        ? 'Stop or finish the current attempt before sending another request.'
        : undefined;
  const unknown = latest?.state === 'outcome-unknown';
  return (
    <section className={s.recipe} aria-label="Recoverable chat recipe">
      <p className={s.disclosure}>
        <strong>Simulated host.</strong> No provider, network or durable backend is connected.
        Reloading clears this local conversation.
      </p>
      <div className={s.workspace}>
        <aside className={s.inspector} aria-label="Recovery status">
          <h2 className={s.srOnly}>Connection recovery</h2>
          {current && state.refresh === 'idle' && !state.error ? (
            <Accordion
              type="single"
              collapsible
              region={false}
              headingLevel={3}
              items={[
                {
                  value: 'connection',
                  title: 'Transport connected · current snapshot',
                  content: (
                    <ConnectionStatus
                      variant="compact"
                      value={state.connection}
                      submission={state.refresh}
                      error={state.error}
                      onRefresh={() => host.refresh()}
                    />
                  ),
                },
              ]}
            />
          ) : (
            <ConnectionStatus
              variant="compact"
              value={state.connection}
              submission={state.refresh}
              error={state.error}
              onRefresh={() => host.refresh()}
            />
          )}
          {latest && (
            <div
              className={s.receipt}
              ref={receiptRef}
              tabIndex={-1}
              role="group"
              aria-label="Original request"
            >
              <h2>Original request</h2>
              <StatusBadge
                state={latest.state === 'acknowledged' ? 'pending' : latest.state}
                label={
                  latest.state === 'acknowledged'
                    ? 'Received by server'
                    : latest.state === 'submitting'
                      ? 'Awaiting acknowledgement'
                      : undefined
                }
              />
              <p>{latest.detail}</p>
              {unknown && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!current}
                    onClick={() => {
                      host.lookup(latest.command);
                      requestAnimationFrame(() => receiptRef.current?.focus());
                    }}
                  >
                    Look up original receipt
                  </Button>
                  <p className={s.muted}>Checks the original request without sending it again.</p>
                </>
              )}
              <Accordion
                type="single"
                collapsible
                headingLevel={3}
                items={[
                  {
                    value: 'original-request',
                    title: 'Request details',
                    content: (
                      <dl className={s.metadata}>
                        <div>
                          <dt>Request</dt>
                          <dd>{latest.command.commandId}</dd>
                        </div>
                        <div>
                          <dt>Operation</dt>
                          <dd>{latest.command.operation}</dd>
                        </div>
                        <div>
                          <dt>Bound attempt</dt>
                          <dd>{latest.command.scope.attemptId}</dd>
                        </div>
                        <div>
                          <dt>Run version</dt>
                          <dd>{latest.command.expectedRunVersion}</dd>
                        </div>
                      </dl>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </aside>
        <div className={s.chat}>
          <RecoveryTranscript state={state} />
          <div className={s.composer}>
            <div className={s.actions} role="group" aria-label="Response recovery actions">
              {active ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!ready}
                  onClick={() => host.request('stop')}
                >
                  Stop response
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!ready}
                    onClick={() => host.request('retry')}
                  >
                    Retry as new attempt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!ready || state.runtime.run.lifecycle === 'succeeded'}
                    onClick={() => host.request('continue')}
                  >
                    Continue in new attempt
                  </Button>
                </>
              )}
            </div>
            <PromptInput
              variant="compact"
              aria-label="Recovery message composer"
              value={state.draft}
              onValueChange={host.setDraft}
              onSubmit={() => host.request('send')}
              submitDisabled={!!reason}
              submitDisabledReason={reason}
              placeholder="Your draft stays here while the connection recovers."
            />
          </div>
        </div>
      </div>
      <p
        className={latest?.detail === state.notice ? s.srOnly : s.announcement}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {state.notice}
      </p>
      <RecoveryControls host={host} state={state} />
    </section>
  );
}
