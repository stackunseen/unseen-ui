'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  Button,
  ConnectionStatus,
  IconButton,
  Message,
  Select,
  StatusBadge,
} from '@ai-interaction/react';
import { createAdapterSession } from '@ai-interaction/core/adapter';
import type { AdapterSession } from '@ai-interaction/core/adapter';
import type { HistoryPageRequest } from '@ai-interaction/core/history';
import { createLocalRecoveryHost } from './recovery-host';
import type { LocalRecoveryHost } from './recovery-host';
import s from './recovery-example.module.css';

type Environment = { host: LocalRecoveryHost; session: AdapterSession };
type Presentation = 'banner' | 'card' | 'compact';

/** Opt-in, disposable local simulation. Mounting does not connect or submit. */
export function RecoveryExample() {
  const [environment, setEnvironment] = useState<Environment>();
  useEffect(() => {
    const host = createLocalRecoveryHost();
    const session = createAdapterSession(host.port, host.scope, host.initialSnapshot);
    setEnvironment({ host, session });
    return () => {
      session.dispose();
      host.dispose();
    };
  }, []);
  return environment ? (
    <RecoveryWorkspace
      key={environment.session.getSnapshot().scope.streamId}
      environment={environment}
    />
  ) : (
    <p className={s.muted}>Preparing the local recovery example…</p>
  );
}

function RecoveryWorkspace({ environment: { host, session } }: { environment: Environment }) {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const [variant, setVariant] = useState<Presentation>('card');
  const [armed, setArmed] = useState(false);
  const [notice, setNotice] = useState(
    'Refresh snapshot connects and subscribes to this local host.',
  );
  const [error, setError] = useState<string>();
  const [checking, setChecking] = useState(false);
  const connectionArea = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const original = state.commands[0];
  const connected = state.connection.state === 'connected';
  const current = connected && state.connection.freshness === 'current';
  const canRequest = current && !state.opening && !original;
  const latest = state.runtime.messages.find((message) => message.id === 'local-action-response');

  async function refresh() {
    setError(undefined);
    const previousFocus = document.activeElement;
    const focusWasInside = connectionArea.current?.contains(previousFocus) ?? false;
    const result = await session.refresh();
    if (!mounted.current) return;
    setNotice(
      result === 'ready'
        ? 'Current host checkpoint received. Original command receipts are unchanged.'
        : 'A coherent host checkpoint could not be established.',
    );
    // Refresh may remove the offline footer after a successful connection.
    if (focusWasInside && previousFocus && !previousFocus.isConnected) {
      requestAnimationFrame(() => {
        if (mounted.current && document.activeElement === document.body)
          connectionArea.current?.focus();
      });
    }
  }
  async function requestReview() {
    if (!canRequest) return;
    setError(undefined);
    setArmed(false);
    try {
      const receipt = await session.submit({
        commandId: 'local-review-original-1',
        scope: host.scope,
        expectedRunVersion: state.runtime.run.version,
        operation: 'request-local-review',
        payload: { subject: 'Component spacing' },
      });
      if (mounted.current)
        setNotice(
          receipt.state === 'outcome-unknown'
            ? 'Acknowledgement was lost. Check the original receipt; the request was not repeated.'
            : 'Request received. Apply the host event to advance the fixed local run.',
        );
    } catch (cause) {
      if (mounted.current)
        setError(cause instanceof Error ? cause.message : 'Request unavailable.');
    }
  }
  async function checkReceipt() {
    if (!original || checking) return;
    setChecking(true);
    setError(undefined);
    try {
      const receipt = await session.reconcile(original.command.commandId);
      if (mounted.current)
        setNotice(
          receipt.state === 'acknowledged'
            ? 'The original receipt confirms acceptance. This does not establish execution.'
            : 'The original outcome remains unknown. The request has not been repeated.',
        );
    } catch (cause) {
      if (mounted.current)
        setError(cause instanceof Error ? cause.message : 'Receipt lookup unavailable.');
    } finally {
      if (mounted.current) setChecking(false);
    }
  }
  async function page(request: HistoryPageRequest) {
    await session.page(request);
  }
  return (
    <section
      className={s.example}
      aria-label="Local adapter recovery example"
      data-recovery-example
    >
      <header className={s.header}>
        <div className={s.heading}>
          <h3>Connect, inspect, recover</h3>
          <p>In-memory local host · exact original receipts · no provider integration</p>
        </div>
        <label className={s.setting}>
          Connection presentation
          <Select
            aria-label="Recovery connection presentation"
            value={variant}
            onValueChange={(value) => setVariant(value as Presentation)}
            options={[
              { value: 'banner', label: 'Banner' },
              { value: 'card', label: 'Card' },
              { value: 'compact', label: 'Compact' },
            ]}
          />
        </label>
      </header>
      <div
        className={s.connection}
        ref={connectionArea}
        tabIndex={-1}
        role="group"
        aria-label="Local connection status"
      >
        <ConnectionStatus
          value={state.connection}
          variant={variant}
          submission={state.opening ? 'submitting' : 'idle'}
          onRefresh={() => {
            void refresh();
          }}
        />
      </div>
      <div className={s.grid}>
        <section className={s.panel} aria-label="Original local request">
          <div className={s.row}>
            <div className={s.heading}>
              <h4>Fixed local review</h4>
              <p>Acceptance is a receipt; only a host event advances this run.</p>
            </div>
            <div className={s.rail} role="group" aria-label="Host connection actions">
              <IconButton
                icon="retry"
                label="Refresh local host checkpoint"
                disabled={!connected || state.opening}
                onClick={() => {
                  void refresh();
                }}
              />
              <IconButton
                icon="paused"
                label="Interrupt local connection"
                disabled={!connected || state.opening}
                onClick={() => {
                  host.interrupt();
                  setNotice(
                    'Subscription interrupted. The host retains its state and original receipts.',
                  );
                }}
              />
            </div>
          </div>
          <div className={s.run}>
            <StatusBadge
              state={state.runtime.run.lifecycle}
              label={`Client run: ${state.runtime.run.lifecycle}`}
            />
            <span>
              Version {state.runtime.run.version} · cursor {state.runtime.lastSequence}
            </span>
          </div>
          <div className={s.receipt}>
            <strong>Original request</strong>
            <p>{original ? original.command.commandId : 'No request submitted.'}</p>
            {original && (
              <StatusBadge
                state={original.state === 'acknowledged' ? 'pending' : original.state}
                label={
                  original.state === 'acknowledged'
                    ? 'Received; execution separate'
                    : original.state === 'submitting'
                      ? 'Awaiting receipt'
                      : original.state === 'outcome-unknown'
                        ? 'Original outcome unknown'
                        : 'Request rejected'
                }
              />
            )}
            {original?.detail && <p>Receipt at submission: {original.detail}</p>}
          </div>
          <p className={s.muted}>
            {original
              ? 'The original receipt is retained. Recovery does not repeat this request.'
              : armed
                ? 'The next acknowledgement will be dropped. Its original receipt stays in the host.'
                : 'Use the warning icon before submitting to simulate a lost acknowledgement.'}
          </p>
          <div className={s.actions} role="group" aria-label="Local request actions">
            <div className={s.rail}>
              <IconButton
                icon="warning"
                label="Simulate lost acknowledgement on next request"
                disabled={!canRequest || armed}
                data-armed={armed}
                onClick={() => {
                  host.loseNextAcknowledgement();
                  setArmed(true);
                }}
              />
              <IconButton
                icon="search"
                label="Check original receipt"
                disabled={original?.state !== 'outcome-unknown' || checking}
                onClick={() => {
                  void checkReceipt();
                }}
              />
              <IconButton
                icon="running"
                label="Apply fixed local host event"
                disabled={!original || !host.canAdvance(original.command.commandId)}
                onClick={() => {
                  if (!original) return;
                  host.advance(original.command.commandId);
                  setNotice(
                    connected
                      ? 'Host events advanced the client run and emitted the sample response.'
                      : 'The host applied the action while disconnected. Refresh to observe it.',
                  );
                }}
              />
            </div>
            <Button
              size="sm"
              disabled={!canRequest}
              onClick={() => {
                void requestReview();
              }}
            >
              Request local review
            </Button>
          </div>
          <p className={s.muted} role="status">
            {notice}
          </p>
          {error && (
            <p className={s.error} role="alert">
              {error}
            </p>
          )}
          {latest ? (
            <Message value={latest} variant={variant === 'card' ? 'panel' : 'plain'} />
          ) : (
            <p className={s.muted}>No host action output received yet.</p>
          )}
        </section>
        <section className={s.panel} aria-label="Bounded host history">
          <div className={s.row}>
            <div className={s.heading}>
              <h4>Snapshot history</h4>
              <p>Four messages per page at one immutable checkpoint.</p>
            </div>
            <div className={s.rail} role="group" aria-label="History paging">
              <IconButton
                icon="moveUp"
                label="Read older host history"
                disabled={
                  !current || state.historyLoading || state.history?.older.state !== 'available'
                }
                onClick={() => {
                  const history = state.history;
                  if (history?.older.cursor)
                    void page({
                      context: history.context,
                      direction: 'older',
                      cursor: history.older.cursor,
                    });
                }}
              />
              <IconButton
                icon="moveDown"
                label="Read newer host history"
                disabled={
                  !current || state.historyLoading || state.history?.newer.state !== 'available'
                }
                onClick={() => {
                  const history = state.history;
                  if (history?.newer.cursor)
                    void page({
                      context: history.context,
                      direction: 'newer',
                      cursor: history.newer.cursor,
                    });
                }}
              />
            </div>
          </div>
          {state.history ? (
            <>
              <p className={s.muted}>
                Checkpoint {state.history.context.version} · messages{' '}
                {state.history.startIndex! + 1}–
                {state.history.startIndex! + state.history.messages.length} of{' '}
                {state.history.totalMessages}
              </p>
              <div className={s.messages}>
                {state.history.messages.map((message) => (
                  <Message key={message.id} value={message} variant="plain" />
                ))}
              </div>
            </>
          ) : (
            <p className={s.muted}>Connect with Refresh snapshot to read host history.</p>
          )}
          {state.historyLoading && (
            <p className={s.muted} role="status">
              Reading the original history checkpoint…
            </p>
          )}
          {state.historyError && (
            <p className={s.error} role="alert">
              {state.historyError}
            </p>
          )}
        </section>
      </div>
      <p className={s.muted}>
        This fixed local simulation has one action per mount. It stores no durable data and verifies
        no real provider, permission or production recovery behavior.
      </p>
    </section>
  );
}
