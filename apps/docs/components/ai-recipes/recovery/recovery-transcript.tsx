import { useRef } from 'react';
import { Button, Message, StatusBadge } from '@stackunseen/ui';
import type { RecoveryState } from './recovery-host';
import s from './recovery.module.css';

/** Reading is manual. Host events never move scroll or keyboard focus. */
export function RecoveryTranscript({ state }: { state: RecoveryState }) {
  const viewport = useRef<HTMLDivElement>(null);
  const latest = useRef<HTMLDivElement>(null);
  const stale = state.connection.freshness !== 'current';
  return (
    <>
      <div className={s.transcriptHeader}>
        <div>
          <h2>Rollout checklist</h2>
          <p className={s.muted}>
            Attempt {state.runtime.run.attemptId.replace('checklist-attempt-', '')} · partial output
            stays visible
          </p>
        </div>
        <StatusBadge
          state={stale ? 'unknown' : state.runtime.run.lifecycle}
          label={
            stale
              ? 'Run state may be stale'
              : state.runtime.run.lifecycle === 'cancelled'
                ? 'Stopped by host'
                : undefined
          }
        />
      </div>
      <div
        ref={viewport}
        className={s.transcript}
        role="region"
        aria-label="Conversation history"
        tabIndex={0}
      >
        {state.runtime.messages.map((message) => (
          <Message
            key={message.id}
            variant="plain"
            value={
              stale && message.state === 'streaming'
                ? { ...message, state: 'interrupted' }
                : message
            }
            responseVariant="cursor"
          />
        ))}
        <div ref={latest} />
      </div>
      <div className={s.readingControls}>
        <span className={s.muted}>Manual scrolling · updates keep your reading position</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            latest.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
            viewport.current?.focus({ preventScroll: true });
          }}
        >
          Jump to latest
        </Button>
      </div>
    </>
  );
}
