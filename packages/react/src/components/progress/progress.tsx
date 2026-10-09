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
  /** Hidden keeps the label for assistive technology when the title is already on screen. */
  labelVisibility?: 'visible' | 'hidden';
  /** Hide the visible reading when the host prints it elsewhere. */
  showReading?: boolean;
}
export function Progress({
  label,
  value,
  max = 100,
  valueText,
  labelVisibility = 'visible',
  showReading = true,
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
      <div
        className={s.progressLabel}
        data-label-visibility={labelVisibility}
        hidden={labelVisibility === 'hidden' && !showReading ? true : undefined}
      >
        <span id={labelId} className={labelVisibility === 'hidden' ? s.srOnly : undefined}>
          {label.trim() || 'Progress'}
        </span>
        {showReading && (
          <span className={s.progressReading} aria-hidden="true">
            {reading}
          </span>
        )}
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
