import type { ComponentProps, ReactNode } from 'react';
import { DataTable } from './shared.js';
import css from './data-marks.module.css';
import dots from '../data-dots/data-dots.module.css';

export type TrackerStatus = 'ok' | 'degraded' | 'failed' | 'unknown';

export interface TrackerSegment {
  /** The period or run in words: "Oct 7", "Run 1042". */
  label: string;
  status: TrackerStatus;
  /** Extra words for the tooltip and the hidden table: "3 of 40 runs failed". */
  detail?: string;
}

export interface TrackerProps extends Omit<ComponentProps<'figure'>, 'children'> {
  /** Names the figure for assistive technology and the hidden table. */
  label: string;
  /** One block per period or run, oldest first. */
  segments: readonly TrackerSegment[];
  /** Printed under the strip, formatted by your app: "99.2% of runs succeeded". */
  summary?: ReactNode;
  /** Printed at the two ends: ['30 days ago', 'Today']. */
  axis?: readonly [string, string];
}

const words: Record<TrackerStatus, string> = {
  ok: 'Succeeded',
  degraded: 'Degraded',
  failed: 'Failed',
  unknown: 'No data',
};
const known = (status: string): status is TrackerStatus =>
  Object.prototype.hasOwnProperty.call(words, status);

/**
 * A strip of blocks, one per day or run, coloured by how it went. Status is never colour
 * alone: each block names its status in a tooltip, and every block is in a hidden table.
 */
export function Tracker({
  label,
  segments,
  summary,
  axis,
  className = '',
  ...props
}: TrackerProps) {
  const status = (segment: TrackerSegment) => (known(segment.status) ? segment.status : 'unknown');
  return (
    <figure
      {...props}
      data-part="tracker"
      className={`${dots.figure} ${className}`}
      aria-label={label}
    >
      <div className={css.tracker} aria-hidden="true">
        {segments.map((segment, index) => (
          <span
            key={index}
            data-status={status(segment)}
            title={`${segment.label}: ${words[status(segment)]}${segment.detail ? `, ${segment.detail}` : ''}`}
          />
        ))}
      </div>
      {(axis !== undefined || summary !== undefined) && (
        <figcaption>
          <span>{axis?.[0]}</span>
          {summary !== undefined && <span className={css.trackerSummary}>{summary}</span>}
          <span>{axis?.[1]}</span>
        </figcaption>
      )}
      <DataTable
        label={label}
        columns={['Period', 'Status', 'Detail']}
        rows={segments.map((segment) => [
          segment.label,
          words[status(segment)],
          segment.detail ?? '',
        ])}
      />
    </figure>
  );
}
