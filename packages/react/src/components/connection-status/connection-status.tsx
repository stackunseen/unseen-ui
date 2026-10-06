'use client';
import type { ConnectionInfo, RecoveryCursor, SubmissionState } from '@stackunseen/ui-core';
import { validCount, validTimestamp } from '@stackunseen/ui-core';
import { Accordion } from '../accordion/accordion.js';
import { Panel } from '../panel/panel.js';
import { Button } from '../button/button.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import actions from '../../shared/styles/action-layout.module.css';
import { ObservationTime } from '../../shared/observation-time/observation-time.js';

export interface ConnectionStatusProps extends VariantProps<'ConnectionStatus'> {
  value: ConnectionInfo;
  submission?: SubmissionState;
  error?: string;
  onResume?: (cursor: RecoveryCursor) => void;
  onRefresh?: () => void;
}

export function ConnectionStatus({
  value,
  variant = 'banner',
  submission = 'idle',
  error,
  onResume,
  onRefresh,
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
    <Panel className={s.connectionStatus} data-variant={variant} data-interrupted={interrupted}>
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
              : 'Receiving host updates. Connection status does not indicate run completion.'}
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
                  ? 'Refresh an authoritative snapshot before applying further events.'
                  : 'An authoritative snapshot is required before applying further events. Snapshot refresh is unavailable here; the host must supply current data.'
                : uncertainFreshness && value.state === 'connected'
                  ? canRefresh
                    ? 'Refresh an authoritative snapshot to inspect current host data.'
                    : 'Snapshot refresh is unavailable here. The host must supply current data.'
                  : !value.adapter.resume
                    ? 'This adapter cannot replay missed updates.'
                    : !cursor
                      ? 'A valid resume cursor is unavailable.'
                      : !onResume
                        ? 'Resume is unavailable through this host.'
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
              ? 'Recovery outcome unknown. Refresh the snapshot to inspect host state. The host must reconcile the original request before it is repeated.'
              : 'Recovery outcome unknown. Snapshot refresh is unavailable here. The host must reconcile the original request before it is repeated.'
            : submission === 'acknowledged'
              ? 'Recovery request received. Waiting for host state.'
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
