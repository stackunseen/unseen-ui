'use client';
import { useId } from 'react';
import type { ComponentProps } from 'react';
import s from '../../shared/styles/feedback.module.css';

export interface ProgressProps extends Omit<
  ComponentProps<'progress'>,
  | 'children'
  | 'value'
  | 'max'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-valuenow'
  | 'aria-valuemin'
  | 'aria-valuemax'
  | 'aria-valuetext'
> {
  label: string;
  /** Measured value only. null/undefined/non-finite values remain indeterminate. */
  value?: number | null;
  /** Finite, positive measurement maximum. Invalid maxima remain indeterminate. */
  max?: number;
  /** Human-readable measurement, e.g. "3 of 8 files". Also exposed to assistive technology. */
  valueText?: string;
}
export function Progress({
  label,
  value,
  max = 100,
  valueText,
  className = '',
  ...props
}: ProgressProps) {
  const labelId = useId();
  const validMax = Number.isFinite(max) && max > 0;
  const measured = validMax && typeof value === 'number' && Number.isFinite(value);
  const bounded = measured ? Math.min(max, Math.max(0, value)) : undefined;
  const state = measured ? (bounded === max ? 'complete' : 'determinate') : 'indeterminate';
  const reading =
    valueText ?? (bounded === undefined ? 'In progress' : `${Math.floor((bounded / max) * 100)}%`);
  return (
    <div className={s.progressGroup} data-state={state}>
      <div className={s.progressLabel}>
        <span id={labelId}>{label.trim() || 'Progress'}</span>
        <span className={s.progressReading} aria-hidden="true">
          {reading}
        </span>
      </div>
      <progress
        {...props}
        className={`${s.progress} ${className}`}
        aria-labelledby={labelId}
        aria-valuetext={valueText || undefined}
        max={validMax ? max : undefined}
        value={bounded}
        data-state={state}
      />
    </div>
  );
}
