'use client';
import { useId } from 'react';
import type { ComponentProps } from 'react';
import s from './progress-ring.module.css';

export interface ProgressRingProps extends Omit<ComponentProps<'div'>, 'children'> {
  label: string;
  /** Measured value only. null/undefined/non-finite values remain indeterminate. */
  value?: number | null;
  /** Finite, positive measurement maximum. Invalid maxima remain indeterminate. */
  max?: number;
  /** Human-readable measurement, e.g. "3 of 9". Also exposed to assistive technology. */
  valueText?: string;
  /** Hidden keeps the label for assistive technology when the title is already on screen. */
  labelVisibility?: 'visible' | 'hidden';
  /** Hide the visible reading when the host prints it elsewhere. */
  showReading?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

const RADIUS = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** The circular sibling of Progress: the same inputs and semantics, drawn as an SVG ring. */
export function ProgressRing({
  label,
  value,
  max = 100,
  valueText,
  labelVisibility = 'visible',
  showReading = true,
  size = 'default',
  className = '',
  ...props
}: ProgressRingProps) {
  const labelId = useId();
  const validMax = Number.isFinite(max) && max > 0;
  const measured = validMax && typeof value === 'number' && Number.isFinite(value);
  const bounded = measured ? Math.min(max, Math.max(0, value)) : undefined;
  const fraction = bounded === undefined ? 0 : bounded / max;
  const state = measured ? (bounded === max ? 'complete' : 'determinate') : 'indeterminate';
  const reading =
    valueText ?? (bounded === undefined ? 'In progress' : `${Math.floor(fraction * 100)}%`);
  return (
    <div
      {...props}
      className={`${s.root} ${className}`}
      data-part="progress-ring"
      data-state={state}
      data-size={size}
    >
      <div
        role="progressbar"
        className={s.ring}
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={validMax ? max : undefined}
        aria-valuenow={bounded}
        aria-valuetext={valueText || undefined}
      >
        <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <circle className={s.track} cx="16" cy="16" r={RADIUS} />
          <circle
            className={s.value}
            cx="16"
            cy="16"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - (measured ? fraction : 0.25))}
            transform="rotate(-90 16 16)"
          />
        </svg>
      </div>
      <div className={s.text} data-label-visibility={labelVisibility}>
        <span id={labelId} className={labelVisibility === 'hidden' ? s.srOnly : undefined}>
          {label.trim() || 'Progress'}
        </span>
        {showReading && (
          <span className={s.reading} aria-hidden="true">
            {reading}
          </span>
        )}
      </div>
    </div>
  );
}
