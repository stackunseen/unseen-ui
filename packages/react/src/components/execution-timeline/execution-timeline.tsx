'use client';
import type React from 'react';
import { StatusBadge } from '../status-badge/status-badge.js';
import { Select } from '../select/select.js';
import type { DetailLevel, DetailProps, VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import own from './execution-timeline.module.css';
import { ObservationTime } from '../../shared/observation-time/observation-time.js';

export interface TimelineEntry {
  id: string;
  label: string;
  state: string;
  timestamp: string;
  durationMs?: number;
  detail?: string;
  /** A formatted cost for this step, such as "$0.04"; the host formats it. */
  cost?: string;
  /** A formatted token count, such as "1.2k tokens". */
  tokens?: string;
  /** The step this one ran inside; the waterfall folds children under their parent. */
  parentId?: string;
}

const startOf = (entry: TimelineEntry) => {
  const ms = Date.parse(entry.timestamp);
  return Number.isFinite(ms) ? ms : undefined;
};
const measured = (entry: TimelineEntry) =>
  entry.durationMs !== undefined && Number.isFinite(entry.durationMs) && entry.durationMs >= 0
    ? entry.durationMs
    : undefined;

function Waterfall({ entries, detail }: { entries: TimelineEntry[]; detail: DetailLevel }) {
  const starts = entries.map(startOf).filter((v): v is number => v !== undefined);
  const origin = starts.length ? Math.min(...starts) : 0;
  const ends = entries.map((entry) => (startOf(entry) ?? origin) + (measured(entry) ?? 0));
  const total = Math.max(1, ...ends.map((end) => end - origin));
  const durations = entries.map(measured).filter((v): v is number => v !== undefined);
  const slowest = durations.length ? Math.max(...durations) : undefined;
  const ids = new Set(entries.map((entry) => entry.id));
  const children = new Map<string, TimelineEntry[]>();
  const roots: TimelineEntry[] = [];
  for (const entry of entries) {
    if (entry.parentId && ids.has(entry.parentId) && entry.parentId !== entry.id) {
      const list = children.get(entry.parentId) ?? [];
      list.push(entry);
      children.set(entry.parentId, list);
    } else roots.push(entry);
  }
  const row = (entry: TimelineEntry) => {
    const start = startOf(entry) ?? origin;
    const duration = measured(entry);
    const left = ((start - origin) / total) * 100;
    const width = duration === undefined ? 0 : (duration / total) * 100;
    return (
      <div className={own.wfRow} data-state={entry.state}>
        <span className={own.wfLabel}>
          <strong>{entry.label}</strong>
          <small>
            <ObservationTime value={entry.timestamp} />
          </small>
          {entry.detail && <small>{entry.detail}</small>}
        </span>
        <span className={own.wfTrack} aria-hidden="true">
          <span
            className={own.wfBar}
            data-slowest={slowest !== undefined && duration === slowest ? '' : undefined}
            data-unmeasured={duration === undefined ? '' : undefined}
            style={{ insetInlineStart: `${left}%`, inlineSize: `${Math.max(0.8, width)}%` }}
          />
        </span>
        <span className={own.wfMeta}>
          <span className={own.numeric}>{timelineDuration(entry.durationMs, detail) ?? '—'}</span>
          {entry.tokens && <span className={own.numeric}>{entry.tokens}</span>}
          {entry.cost && <span className={own.numeric}>{entry.cost}</span>}
          {slowest !== undefined && duration === slowest && (
            <span className={own.wfSlowest}>Slowest</span>
          )}
          <StatusBadge state={entry.state} variant="icon" />
        </span>
      </div>
    );
  };
  const render = (list: TimelineEntry[]): React.ReactNode => (
    <ol className={own.wfList}>
      {list.map((entry) => {
        const nested = children.get(entry.id);
        return (
          <li key={entry.id} className={own.wfItem}>
            {nested && nested.length > 0 ? (
              <details open className={own.wfFold}>
                <summary className={own.wfSummary}>{row(entry)}</summary>
                {render(nested)}
              </details>
            ) : (
              row(entry)
            )}
          </li>
        );
      })}
    </ol>
  );
  return (
    <div className={own.waterfall}>
      {entries.length === 0 ? <p className={s.muted}>No matching events.</p> : render(roots)}
      <div className={own.wfAxis} aria-hidden="true">
        <span className={own.numeric}>0 ms</span>
        <span className={own.numeric}>{timelineDuration(total, 'compact')}</span>
      </div>
    </div>
  );
}

function timelineDuration(durationMs: number | undefined, detail: DetailLevel): string | undefined {
  const measured = durationMs !== undefined && Number.isFinite(durationMs) && durationMs >= 0;
  if (detail === 'full') return measured ? `Took ${durationMs} ms` : 'Duration unknown';
  return measured ? `${durationMs} ms` : undefined;
}

export function ExecutionTimeline({
  variant = 'timeline',
  entries,
  filter = 'all',
  onFilterChange,
  detail = 'compact',
}: VariantProps<'ExecutionTimeline'> &
  DetailProps & {
    entries: TimelineEntry[];
    filter?: 'all' | 'failed';
    onFilterChange?: (value: 'all' | 'failed') => void;
  }) {
  const shown = filter === 'failed' ? entries.filter((e) => e.state === 'failed') : entries;
  return (
    <div className={own.timeline} data-variant={variant} data-detail={detail}>
      {onFilterChange && (
        <label className={s.field + ' ' + own.field}>
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
      {variant === 'waterfall' ? (
        <Waterfall entries={shown} detail={detail} />
      ) : variant === 'table' ? (
        <div
          className={s.tableScroll}
          tabIndex={0}
          role="region"
          aria-label="Execution event table"
        >
          <table className={s.table + ' ' + own.table}>
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
                    {timelineDuration(e.durationMs, detail) && (
                      <small>{timelineDuration(e.durationMs, detail)}</small>
                    )}
                  </td>
                  <td>
                    <ObservationTime value={e.timestamp} />
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
        <ol className={s.list + ' ' + own.list}>
          {shown.length === 0 && <li className={s.muted}>No matching events.</li>}
          {shown.map((e) => (
            <li key={e.id} className={s.item + ' ' + own.item}>
              <div className={s.grow}>
                <strong>{e.label}</strong>
                <div className={s.muted}>
                  <ObservationTime value={e.timestamp} />
                  {timelineDuration(e.durationMs, detail)
                    ? ` · ${timelineDuration(e.durationMs, detail)}`
                    : ''}
                  {e.tokens ? ` · ${e.tokens}` : ''}
                  {e.cost ? ` · ${e.cost}` : ''}
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
