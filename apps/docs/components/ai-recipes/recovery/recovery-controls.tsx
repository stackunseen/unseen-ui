import { Accordion, Button, Select } from '@stackunseen/ui';
import type { RecoveryHost, RecoveryState } from './recovery-host';
import s from './recovery.module.css';

const scenarios = [
  { value: 'received', label: 'Deliver acknowledgement' },
  { value: 'lost', label: 'Lose acknowledgement' },
  { value: 'rejected', label: 'Reject request' },
] as const;

export function RecoveryControls({ host, state }: { host: RecoveryHost; state: RecoveryState }) {
  const pending = state.commands.find((item) => item.state === 'submitting');
  const received =
    state.commands.some((item) => item.state === 'acknowledged') && !host.available();
  const running = state.runtime.run.lifecycle === 'running';
  return (
    <Accordion
      type="single"
      collapsible
      region={false}
      headingLevel={2}
      className={s.controls}
      items={[
        {
          value: 'host',
          title: 'Simulated host controls',
          keepMounted: true,
          content: (
            <div className={s.controlBody}>
              <p className={s.muted}>
                Each button delivers a fixed host observation. Nothing advances on a timer.
              </p>
              <label className={s.field}>
                <span>Next request acknowledgement</span>
                <Select
                  aria-label="Next request acknowledgement"
                  options={scenarios}
                  value={state.scenario}
                  disabled={!!pending}
                  onValueChange={(value) => {
                    if (value === 'received' || value === 'lost' || value === 'rejected')
                      host.setScenario(value);
                  }}
                />
              </label>
              <label className={s.check}>
                <input
                  type="checkbox"
                  checked={state.lookupUnavailable}
                  onChange={(event) => host.setLookupUnavailable(event.target.checked)}
                />
                Original receipt lookup unavailable
              </label>
              <div className={s.actions} role="group" aria-label="Host event delivery">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={state.connection.state !== 'connected'}
                  onClick={host.disconnect}
                >
                  Disconnect transport
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!running || state.connection.state !== 'connected'}
                  onClick={host.advance}
                >
                  Deliver next output
                </Button>
                <Button size="sm" variant="outline" disabled={!running} onClick={host.failResponse}>
                  Fail response
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!pending}
                  onClick={host.settleAcknowledgement}
                >
                  Deliver request result
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    !received ||
                    !!pending ||
                    state.commands.some((item) => item.state === 'outcome-unknown') ||
                    state.connection.freshness !== 'current'
                  }
                  onClick={host.applyReceived}
                >
                  Apply received request
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={state.refresh !== 'submitting'}
                  onClick={() => host.settleRefresh(state.refreshId)}
                >
                  Deliver refreshed snapshot
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={state.refresh !== 'submitting'}
                  onClick={() => host.settleRefresh(state.refreshId, true)}
                >
                  Fail snapshot refresh
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!running || !pending || pending.command.operation !== 'stop'}
                  onClick={host.finishBeforeStop}
                >
                  Complete before stop
                </Button>
                <Button size="sm" variant="outline" onClick={host.replayLast}>
                  Replay last event
                </Button>
              </div>
              <p className={s.muted}>
                A received stop still needs an execution update. Retry and continuation create a new
                attempt and keep the old output. Reconnect refreshes a snapshot; durable stream
                resume is unavailable. Your draft stays editable until you change it.
              </p>
              <p className={s.muted}>
                Requests dispatched: {state.dispatches} · original receipt lookups: {state.lookups}
              </p>
            </div>
          ),
        },
      ]}
    />
  );
}
