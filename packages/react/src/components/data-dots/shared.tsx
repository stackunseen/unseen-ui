import type { ReactNode } from 'react';
import css from './data-dots.module.css';

export interface DotDatum {
  /** The segment, bar, day or cell, in words: "09:00", "Oct 7", "Mon", "S". */
  label: string;
  /** A measured, non-negative count from the application. */
  value: number;
}

export const clean = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);
export const largest = (data: readonly DotDatum[], max?: number) => {
  if (max !== undefined && Number.isFinite(max) && max > 0) return max;
  const seen = Math.max(0, ...data.map((d) => clean(d.value)));
  return seen > 0 ? seen : 1;
};
/** 0..steps for a value against the largest, with any positive value at least one step. */
export const level = (value: number, max: number, steps: number) => {
  const v = clean(value);
  if (v === 0) return 0;
  return Math.max(1, Math.min(steps, Math.round((v / max) * steps)));
};
export const format = (value: number, unit?: string) =>
  `${clean(value).toLocaleString('en-US')}${unit ? ` ${unit}` : ''}`;

/** The same figures as a table, for screen readers and for copying. */
export function DataTable({
  label,
  columns,
  rows,
}: {
  label: string;
  columns: readonly string[];
  rows: readonly (readonly ReactNode[])[];
}) {
  return (
    <div className={css.srOnly}>
      <table>
        <caption>{label}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) =>
                cellIndex === 0 ? (
                  <th key={cellIndex} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={cellIndex}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
