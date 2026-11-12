import { useLocale } from '../../providers/locale/locale.js';
import type { ComponentProps, ReactNode } from 'react';
import { DataTable, swatches } from './shared.js';
import css from './data-marks.module.css';
import dots from '../data-dots/data-dots.module.css';

export interface DonutSlice {
  id: string;
  label: string;
  /** A measured, non-negative value. */
  value: number;
  /** Any CSS colour; defaults follow the library's chart order. */
  swatch?: string;
}

export interface DonutChartProps extends Omit<ComponentProps<'figure'>, 'children'> {
  /** Names the figure for assistive technology and the hidden table. */
  label: string;
  /** Slices in the order to draw them, clockwise from the top. */
  data: readonly DonutSlice[];
  /** The centre figure, formatted by your app: "$1,284". */
  value?: ReactNode;
  /** Under the centre figure: "spend this month". */
  caption?: ReactNode;
  /** Show the legend with each slice's share. */
  legend?: boolean;
  /** Unit for the hidden table, such as "USD". */
  unit?: string;
}

// A circle whose circumference is 100, so dash lengths read as percentages.
const radius = 15.9155;

/**
 * Shares of one total as a ring, the total in the centre and a legend that prints each share,
 * so no slice is read by colour or size alone.
 */
export function DonutChart({
  label,
  data,
  value,
  caption,
  legend = true,
  unit,
  className = '',
  ...props
}: DonutChartProps) {
  const locale = useLocale();
  const clean = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
  const total = data.reduce((sum, slice) => sum + clean(slice.value), 0);
  const share = (n: number) => (total > 0 ? (clean(n) / total) * 100 : 0);
  const percent = (n: number) => {
    const part = share(n);
    return part > 0 && part < 1 ? '<1%' : `${Math.round(part)}%`;
  };
  const colour = (slice: DonutSlice, index: number) =>
    slice.swatch ?? swatches[index % swatches.length]!;
  // Each slice starts where the previous one ended, from 12 o'clock.
  const starts = data.map((_, index) =>
    data.slice(0, index).reduce((sum, slice) => sum + share(slice.value), 0),
  );
  return (
    <figure
      {...props}
      data-part="donut-chart"
      className={`${dots.figure} ${css.donut} ${className}`}
      aria-label={label}
    >
      <div className={css.donutRing}>
        <svg viewBox="0 0 42 42" aria-hidden="true">
          <circle className={css.donutTrack} cx="21" cy="21" r={radius} />
          {data.map((slice, index) => {
            const length = share(slice.value);
            if (length <= 0) return null;
            // A hairline gap between slices; a lone slice draws as a full ring.
            const drawn = length < 100 ? Math.max(0, length - 0.6) : 100;
            return (
              <circle
                key={slice.id}
                cx="21"
                cy="21"
                r={radius}
                stroke={colour(slice, index)}
                strokeDasharray={`${drawn} ${100 - drawn}`}
                strokeDashoffset={25 - (starts[index] ?? 0)}
              />
            );
          })}
        </svg>
        {(value !== undefined || caption !== undefined) && (
          <span className={css.donutCentre}>
            {value !== undefined && <strong>{value}</strong>}
            {caption !== undefined && <small>{caption}</small>}
          </span>
        )}
      </div>
      {legend && (
        <ul className={css.donutLegend} aria-hidden="true">
          {data.map((slice, index) => (
            <li key={slice.id}>
              <i style={{ background: colour(slice, index) }} />
              <span>{slice.label}</span>
              <span className={dots.numeric}>{percent(slice.value)}</span>
            </li>
          ))}
        </ul>
      )}
      <DataTable
        label={label}
        columns={['Slice', unit ?? 'Value', 'Share']}
        rows={data.map((slice) => [
          slice.label,
          clean(slice.value).toLocaleString(locale),
          percent(slice.value),
        ])}
      />
    </figure>
  );
}
