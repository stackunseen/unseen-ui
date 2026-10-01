'use client';
import { StatusBadge } from '../status-badge/status-badge.js';
import { Select } from '../select/select.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';

export interface TimelineEntry {
  id: string;
  label: string;
  state: string;
  timestamp: string;
  durationMs?: number;
  detail?: string;
}

function timelineDuration(durationMs: number | undefined): string {
  return durationMs !== undefined && Number.isFinite(durationMs) && durationMs >= 0
    ? `Host duration ${durationMs} ms`
    : 'Host duration unknown';
}

export function ExecutionTimeline({
  variant = 'timeline',
  entries,
  filter = 'all',
  onFilterChange,
}: VariantProps<'ExecutionTimeline'> & {
  entries: TimelineEntry[];
  filter?: 'all' | 'failed';
  onFilterChange?: (value: 'all' | 'failed') => void;
}) {
  const shown = filter === 'failed' ? entries.filter((e) => e.state === 'failed') : entries;
  return (
    <div className={s.timeline} data-variant={variant}>
      {onFilterChange && (
        <label className={s.field}>
          Show events
          <Select
            value={filter}
            onValueChange={(value) => onFilterChange(value as 'all' | 'failed')}
            options={[
              { value: 'all', label: 'All events' },
              { value: 'failed', label: 'Failures' },
            ]}
          />
        </label>
      )}
      {variant === 'table' ? (
        <div
          className={s.tableScroll}
          tabIndex={0}
          role="region"
          aria-label="Execution event table"
        >
          <table className={s.table}>
            <caption>Execution events</caption>
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">Time</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.label}</strong>
                    {e.detail && <p>{e.detail}</p>}
                    <small>{timelineDuration(e.durationMs)}</small>
                  </td>
                  <td>
                    <time dateTime={e.timestamp}>{e.timestamp}</time>
                  </td>
                  <td>
                    <StatusBadge state={e.state} />
                  </td>
                </tr>
              ))}
              {!shown.length && (
                <tr>
                  <td colSpan={3}>No matching events.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <ol className={s.list}>
          {shown.length === 0 && <li className={s.muted}>No matching events.</li>}
          {shown.map((e) => (
            <li key={e.id} className={s.item}>
              <div className={s.grow}>
                <strong>{e.label}</strong>
                <div className={s.muted}>
                  <time dateTime={e.timestamp}>{e.timestamp}</time>
                  {` · ${timelineDuration(e.durationMs)}`}
                </div>
                {e.detail && <p>{e.detail}</p>}
              </div>
              <StatusBadge state={e.state} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
