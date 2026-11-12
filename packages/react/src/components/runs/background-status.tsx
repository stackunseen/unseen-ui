'use client';
import { useLocale } from '../../providers/locale/locale.js';
import { heartbeatState } from '@stackunseen/ui-core';
import type { Measurement } from '@stackunseen/ui-core';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import { MeasuredText, formatTime } from './shared.js';
import r from './runs.module.css';

export interface BackgroundStatusProps extends VariantProps<'BackgroundStatus'> {
  running: Measurement<number>;
  waiting: Measurement<number>;
  /** Last time the host heard from any background run. */
  lastHeartbeatAt?: string;
  /** Heartbeat age after which the indicator reports no recent update. Defaults to five minutes. */
  staleAfterMs?: number;
  /** The host clock, for deterministic rendering. */
  now?: string;
  onOpen?: () => void;
  locale?: string;
  timeZone?: string;
  label?: string;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}

/** A small persistent indicator for runs still going while the person is elsewhere. */
export function BackgroundStatus({
  variant = 'pill',
  running,
  waiting,
  lastHeartbeatAt,
  staleAfterMs = 5 * 60_000,
  now,
  onOpen,
  locale: localeProp,
  timeZone,
  label = 'Background runs',
  className = '',
}: BackgroundStatusProps) {
  const locale = useLocale(localeProp);
  const clock = now ?? (typeof window === 'undefined' ? undefined : new Date().toISOString());
  const runningCount = running.kind === 'unknown' ? undefined : running.value;
  const waitingCount = waiting.kind === 'unknown' ? undefined : waiting.value;
  const beat = heartbeatState(lastHeartbeatAt, clock, staleAfterMs);
  const stale = beat === 'stale' && (runningCount ?? 0) > 0;
  const idle = runningCount === 0 && waitingCount === 0;
  const tone = waitingCount ? 'warning' : stale ? 'stale' : idle ? 'idle' : 'active';
  const content = (
    <>
      <span className={r.statusIcon} data-tone={tone} aria-hidden="true">
        <AIIcon
          name={waitingCount ? 'warning' : stale ? 'unknown' : idle ? 'check' : 'running'}
          size={15}
        />
      </span>
      <span className={r.statusText} role="status" aria-live="polite">
        {/* Zero counts say nothing; an unknown count still shows, as "?". */}
        {idle && <span>Nothing running</span>}
        {runningCount !== 0 && (
          <span>
            <MeasuredText
              measurement={running}
              format={(value) => String(value)}
              unknownLabel="?"
            />{' '}
            running
          </span>
        )}
        {waitingCount !== 0 && (
          <span>
            <MeasuredText
              measurement={waiting}
              format={(value) => String(value)}
              unknownLabel="?"
            />{' '}
            waiting for you
          </span>
        )}
        {stale && lastHeartbeatAt && (
          <span className={r.stale}>
            No update since {formatTime(lastHeartbeatAt, locale, timeZone)}
          </span>
        )}
      </span>
    </>
  );
  const rootClass = `${r.status} ${className}`;
  return onOpen ? (
    <button
      type="button"
      className={rootClass}
      data-part="background-status"
      data-variant={variant}
      data-tone={tone}
      aria-label={label}
      onClick={onOpen}
    >
      {content}
    </button>
  ) : (
    <div
      className={rootClass}
      data-part="background-status"
      data-variant={variant}
      data-tone={tone}
      aria-label={label}
    >
      {content}
    </div>
  );
}
