import type { ComponentProps, ReactNode } from 'react';
import { DataTable, clean, format, largest, level } from './shared.js';
import type { DotDatum } from './shared.js';
import css from './data-dots.module.css';

export interface DotBarsProps extends Omit<ComponentProps<'figure'>, 'children'> {
  /** Names the figure for assistive technology and the hidden table. */
  label: string;
  /** One column of dots per item, in order: days of a month, steps of a run. */
  data: readonly DotDatum[];
  /** The value that fills a column; defaults to the largest value present. */
  max?: number;
  /** Dots per column. */
  rows?: number;
  /** Item indexes, inclusive, that read in full colour; the rest fade. */
  range?: { start: number; end: number };
  /** Printed under the range: "Oct 7 – 20 · 642 runs". The application sums the figures. */
  rangeLabel?: ReactNode;
  /** Item indexes drawn in the accent colour, for the one that stands out. */
  outliers?: readonly number[];
  /** Printed at the two ends of the axis: ['Oct 1', 'Oct 31']. */
  axis?: readonly [string, string];
  /** Unit for the hidden table, such as "runs". */
  unit?: string;
}

/**
 * A histogram built from dots, one column per item. A range reads darker and gets its own
 * label, an outlier takes the accent colour, and every value is in a hidden table.
 */
export function DotBars({
  label,
  data,
  max,
  rows = 8,
  range,
  rangeLabel,
  outliers = [],
  axis,
  unit,
  className = '',
  ...props
}: DotBarsProps) {
  const top = largest(data, max);
  const steps = Math.max(1, Math.min(16, Math.round(rows)));
  const ranged = range !== undefined && Number.isFinite(range.start) && Number.isFinite(range.end);
  const inRange = (index: number) =>
    ranged &&
    index >= Math.min(range.start, range.end) &&
    index <= Math.max(range.start, range.end);
  return (
    <figure
      {...props}
      data-part="dot-bars"
      className={`${css.figure} ${className}`}
      aria-label={label}
    >
      <div className={css.bars} data-ranged={ranged ? '' : undefined} aria-hidden="true">
        {data.map((datum, index) => {
          const on = level(datum.value, top, steps);
          return (
            <span
              key={index}
              className={css.bar}
              data-in-range={inRange(index) ? '' : undefined}
              data-outlier={outliers.includes(index) ? '' : undefined}
            >
              {Array.from({ length: steps }, (_, dot) => (
                <i key={dot} data-on={steps - dot <= on ? '' : undefined} />
              ))}
            </span>
          );
        })}
      </div>
      {(axis !== undefined || rangeLabel !== undefined) && (
        <figcaption>
          <span className={css.numeric}>{axis?.[0]}</span>
          {rangeLabel !== undefined && <span className={css.numeric}>{rangeLabel}</span>}
          <span className={css.numeric}>{axis?.[1]}</span>
        </figcaption>
      )}
      <DataTable
        label={label}
        columns={['Item', unit ?? 'Value']}
        rows={data.map((datum) => [datum.label, format(clean(datum.value))])}
      />
    </figure>
  );
}
