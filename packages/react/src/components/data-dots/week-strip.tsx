import type { ComponentProps, CSSProperties } from 'react';
import { DataTable, clean, format } from './shared.js';
import css from './data-dots.module.css';

export interface WeekStripSeries {
  id: string;
  label: string;
  /** A colour or CSS custom property reference; the primary colour by default. */
  swatch?: string;
}
export interface WeekStripDay {
  /** "M", "Tue", "Oct 7". */
  label: string;
  /** Measured counts by series id. */
  values: Readonly<Record<string, number>>;
}
export interface WeekStripProps extends Omit<ComponentProps<'figure'>, 'children'> {
  /** Names the figure for assistive technology and the hidden table. */
  label: string;
  /** Seven days, or any short run of columns. */
  days: readonly WeekStripDay[];
  series: readonly WeekStripSeries[];
  /** The total that fills a column; defaults to the largest day total. */
  max?: number;
  /** Index of the current day, printed in bold. */
  current?: number;
  /** Unit for the hidden table, such as "runs". */
  unit?: string;
  /** Hide the series legend when the card prints its own. */
  legend?: boolean;
}

/**
 * A column per day with the series stacked inside it and the rest of the column left as
 * track, so the week reads at a glance. Every count is in a hidden table.
 */
export function WeekStrip({
  label,
  days,
  series,
  max,
  current,
  unit,
  legend = true,
  className = '',
  ...props
}: WeekStripProps) {
  const totals = days.map((day) =>
    series.reduce((sum, s) => sum + clean(day.values[s.id] ?? 0), 0),
  );
  const top = max !== undefined && Number.isFinite(max) && max > 0 ? max : Math.max(1, ...totals);
  return (
    <figure
      {...props}
      data-part="week-strip"
      className={`${css.figure} ${className}`}
      aria-label={label}
    >
      <div className={css.week} aria-hidden="true">
        {days.map((day, index) => {
          const used = Math.min(1, (totals[index] ?? 0) / top);
          return (
            <span key={index} className={css.day} data-current={index === current ? '' : undefined}>
              <span className={css.stack}>
                {used < 1 && <i data-rest="" style={{ blockSize: `${(1 - used) * 100}%` }} />}
                {series.map((s) => {
                  const value = clean(day.values[s.id] ?? 0);
                  if (value === 0) return null;
                  return (
                    <i
                      key={s.id}
                      style={
                        {
                          blockSize: `${(value / top) * 100}%`,
                          ...(s.swatch ? { '--seg': s.swatch } : {}),
                        } as CSSProperties
                      }
                    />
                  );
                })}
              </span>
              <span>{day.label}</span>
            </span>
          );
        })}
      </div>
      {legend && series.length > 1 && (
        <figcaption>
          <span className={css.legend}>
            {series.map((s) => (
              <span
                key={s.id}
                style={s.swatch ? ({ '--seg': s.swatch } as CSSProperties) : undefined}
              >
                {s.label}
              </span>
            ))}
          </span>
        </figcaption>
      )}
      <DataTable
        label={label}
        columns={['Day', ...series.map((s) => s.label), unit ? `Total (${unit})` : 'Total']}
        rows={days.map((day, index) => [
          day.label,
          ...series.map((s) => format(clean(day.values[s.id] ?? 0))),
          format(totals[index] ?? 0),
        ])}
      />
    </figure>
  );
}
