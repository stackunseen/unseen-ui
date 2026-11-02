import type { ComponentProps } from 'react';
import { DataTable, finite, plain } from './shared.js';
import css from './data-marks.module.css';
import dots from '../data-dots/data-dots.module.css';

export interface SparkPoint {
  /** The sample in words: "Oct 7", "09:00". */
  label: string;
  /** A measured value; null is a gap the application did not report. */
  value: number | null;
}

export interface SparklineProps extends Omit<ComponentProps<'figure'>, 'children'> {
  /** Names the figure for assistive technology and the hidden table. */
  label: string;
  /** Samples in time order. */
  data: readonly SparkPoint[];
  /** A line, a line with the area under it filled, or one bar per sample. */
  variant?: 'line' | 'area' | 'bar';
  /** Colour by meaning: rising is good, rising is bad, or neither. */
  tone?: 'neutral' | 'positive' | 'negative';
  /** Mark the last sample with a dot. */
  markLast?: boolean;
  /** Unit for the hidden table, such as "ms". */
  unit?: string;
}

/**
 * A word-sized trend for a stat card or a table cell. It has no axes on purpose: the figure
 * beside it carries the number, and every sample is in a hidden table. Gaps break the line.
 */
export function Sparkline({
  label,
  data,
  variant = 'line',
  tone = 'neutral',
  markLast = false,
  unit,
  className = '',
  ...props
}: SparklineProps) {
  const values = data.map((point) => finite(point.value));
  const known = values.filter((value): value is number => value !== null);
  const low = known.length ? Math.min(...known, ...(variant === 'bar' ? [0] : [])) : 0;
  const high = known.length ? Math.max(...known) : 1;
  const span = high - low || 1;
  const width = 100;
  const height = 32;
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const y = (value: number) => height - 2 - ((value - low) / span) * (height - 4);
  const runs: { x: number; y: number }[][] = [[]];
  values.forEach((value, index) => {
    if (value === null) {
      runs.push([]);
      return;
    }
    runs[runs.length - 1]!.push({
      x: data.length > 1 ? index * step : width / 2,
      y: y(value),
    });
  });
  const lines = runs.filter((run) => run.length > 0);
  const last = values.length ? (values[values.length - 1] ?? null) : null;
  const barWidth = data.length ? width / data.length : width;
  return (
    <figure
      {...props}
      data-part="sparkline"
      data-tone={tone}
      data-variant={variant}
      className={`${dots.figure} ${css.spark} ${className}`}
      aria-label={label}
    >
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        {variant === 'bar'
          ? values.map((value, index) => {
              if (value === null) return null;
              const top = Math.min(y(value), height - 3);
              return (
                <rect
                  key={index}
                  x={index * barWidth + barWidth * 0.15}
                  width={barWidth * 0.7}
                  y={top}
                  height={Math.max(1, height - 2 - top)}
                  rx={0.8}
                />
              );
            })
          : lines.map((run, index) => {
              const d = run.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
              const first = run[0]!;
              const end = run[run.length - 1]!;
              return (
                <g key={index}>
                  {variant === 'area' && run.length > 1 && (
                    <path
                      className={css.sparkArea}
                      d={`${d} L${end.x},${height} L${first.x},${height} Z`}
                    />
                  )}
                  <path className={css.sparkLine} d={d} vectorEffect="non-scaling-stroke" />
                </g>
              );
            })}
      </svg>
      {markLast && last !== null && variant !== 'bar' && (
        <span
          className={css.sparkDot}
          aria-hidden="true"
          style={{ top: `${(y(last) / height) * 100}%` }}
        />
      )}
      <DataTable
        label={label}
        columns={['Sample', unit ?? 'Value']}
        rows={data.map((point, index) => [point.label, plain(values[index] ?? null)])}
      />
    </figure>
  );
}
