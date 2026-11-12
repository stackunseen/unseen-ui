'use client';
import type { ComponentProps } from 'react';
import type { ConnectionInfo, RecoveryCursor, SubmissionState } from '@stackunseen/ui-core';
import { validCount, validTimestamp } from '@stackunseen/ui-core';
import { Accordion } from '../accordion/accordion.js';
import { Panel } from '../panel/panel.js';
import { Button } from '../button/button.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import own from './connection-status.module.css';
import actions from '../../shared/styles/action-layout.module.css';
import { ObservationTime } from '../../shared/observation-time/observation-time.js';

export interface ConnectionStatusProps
  extends VariantProps<'ConnectionStatus'>, ComponentProps<'section'> {
  value: ConnectionInfo;
  submission?: SubmissionState;
  error?: string;
  onResume?: (cursor: RecoveryCursor) => void;
  onRefresh?: () => void;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}

export function ConnectionStatus({
  value,
  variant = 'banner',
  submission = 'idle',
  error,
  onResume,
  onRefresh,
  className = '',
  ...rest
}: ConnectionStatusProps) {
  const incompatible = value.recovery === 'incompatible';
  const uncertainFreshness = value.freshness === 'stale' || value.freshness === 'unknown';
  const interrupted = value.state !== 'connected' || incompatible || uncertainFreshness;
  const resumed =
    value.state === 'connected' && value.recovery === 'resumed' && validTimestamp(value.resumedAt);
  const label = incompatible
    ? 'Connection incompatible'
    : value.state === 'reconnecting'
      ? 'Reconnecting'
      : value.state === 'disconnected'
        ? 'Disconnected'
        : resumed && !uncertainFreshness
          ? 'Connection restored'
          : 'Connected';
  const cursor =
    value.cursor && value.cursor.streamId.trim() && validCount(value.cursor.sequence)
      ? value.cursor
      : undefined;
  const busy = submission === 'submitting';
  const awaiting = busy || submission === 'acknowledged' || submission === 'outcome-unknown';
  const canResume =
    value.state === 'disconnected' &&
    !incompatible &&
    value.adapter.resume &&
    !!cursor &&
    !!onResume;
  const canRefresh = value.adapter.snapshot && !!onRefresh;
  const showRecovery = interrupted || submission !== 'idle';
  return (
    <Panel
      {...rest}
      className={`${own.connectionStatus} ${className}`}
      data-variant={variant}
      data-interrupted={interrupted}
    >
      <div className={s.row}>
        <strong className={s.grow}>
          <AIIcon name={interrupted ? 'warning' : 'check'} /> {label}
        </strong>
        <StatusBadge
          state={
            value.state === 'connected'
              ? 'succeeded'
              : value.state === 'reconnecting'
                ? 'running'
                : 'paused'
          }
          label={
            value.state === 'connected'
              ? 'Transport connected'
              : value.state === 'reconnecting'
                ? 'Connecting'
                : 'Offline'
          }
        />
      </div>
      <p className={s.muted}>
        {value.freshness === 'stale'
          ? 'Snapshot stale. Transport connectivity does not establish current run data.'
          : value.freshness === 'unknown'
            ? 'Snapshot freshness unknown. Transport connectivity does not establish current run data.'
            : interrupted
              ? 'Displayed run data may be out of date. Completed actions are not undone by a connection loss.'
              : 'Receiving updates. Being connected doesn’t mean the run has finished.'}
      </p>
      {value.detail && <p>{value.detail}</p>}
      {resumed && (
        <p className={s.muted}>
          Transport resumed <ObservationTime value={value.resumedAt} />
        </p>
      )}
      {showRecovery && (
        <>
          {interrupted && !canResume && (
            <p className={s.muted}>
              {incompatible
                ? canRefresh
                  ? 'Refresh to get the latest data before continuing.'
                  : 'The latest data is needed before continuing, and it can’t be refreshed from here.'
                : uncertainFreshness && value.state === 'connected'
                  ? canRefresh
                    ? 'Refresh to see the latest data.'
                    : 'The latest data can’t be refreshed from here.'
                  : !value.adapter.resume
                    ? 'This adapter cannot replay missed updates.'
                    : !cursor
                      ? 'A valid resume cursor is unavailable.'
                      : !onResume
                        ? 'Resuming isn’t available here.'
                        : 'A connection attempt is already in progress.'}
            </p>
          )}
          {(canRefresh || onResume) && (
            <div className={actions.footer} role="group" aria-label="Connection recovery">
              {canRefresh && (
                <Button size="sm" variant="outline" disabled={busy} onClick={onRefresh}>
                  Refresh snapshot
                </Button>
              )}
              {onResume && (
                <Button
                  disabled={!canResume || awaiting}
                  onClick={() => {
                    if (canResume && cursor && !awaiting) onResume(cursor);
                  }}
                >
                  Resume connection
                </Button>
              )}
            </div>
          )}
        </>
      )}
      <p role="status" className={s.muted}>
        {busy
          ? 'Requesting recovery…'
          : submission === 'outcome-unknown'
            ? canRefresh
              ? 'It’s not clear whether recovery worked. Refresh to see the latest state, and check the original request before it’s sent again.'
              : 'It’s not clear whether recovery worked, and the data can’t be refreshed from here. Check the original request before it’s sent again.'
            : submission === 'acknowledged'
              ? 'Recovery request received. Waiting for the latest state.'
              : submission === 'failed'
                ? 'Recovery request failed. The previous connection state is retained.'
                : ''}
      </p>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      <Accordion
        type="single"
        collapsible
        region={false}
        items={[
          {
            value: 'connection',
            title: 'Connection details',
            content: (
              <ul className={s.provenance}>
                <li>
                  <span>Adapter</span>
                  <strong>
                    {value.adapter.name} · {value.adapter.version}
                  </strong>
                </li>
                <li>
                  <span>Replay</span>
                  <strong>{value.adapter.resume ? 'Supported' : 'Unavailable'}</strong>
                </li>
                <li>
                  <span>Snapshot recovery</span>
                  <strong>{value.adapter.snapshot ? 'Supported' : 'Unavailable'}</strong>
                </li>
                {value.freshness && (
                  <li>
                    <span>Snapshot freshness</span>
                    <strong>
                      {value.freshness === 'current'
                        ? 'Current'
                        : value.freshness === 'stale'
                          ? 'Stale'
                          : 'Unknown'}
                    </strong>
                  </li>
                )}
                <li>
                  <span>Last cursor</span>
                  <strong>
                    {cursor ? `${cursor.streamId} · sequence ${cursor.sequence}` : 'Unknown'}
                  </strong>
                </li>
              </ul>
            ),
          },
        ]}
      />
    </Panel>
  );
}
