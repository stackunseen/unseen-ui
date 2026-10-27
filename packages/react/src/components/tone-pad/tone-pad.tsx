'use client';
import { useId, useRef } from 'react';
import type { ComponentProps, PointerEvent } from 'react';
import { useFieldControl } from '../field/field.js';
import css from './tone-pad.module.css';

export interface TonePadValue {
  /** 0 at the left label, 1 at the right label. */
  x: number;
  /** 0 at the bottom label, 1 at the top label. */
  y: number;
}
export interface TonePadAxes {
  /** [left, right], such as ['Formal', 'Casual']. */
  x: readonly [string, string];
  /** [bottom, top], such as ['Detailed', 'Brief']. */
  y: readonly [string, string];
}
export interface TonePadProps extends Omit<ComponentProps<'div'>, 'onChange'> {
  /** Names the control when it is not inside a Field. */
  label?: string;
  value: TonePadValue;
  onValueChange: (value: TonePadValue) => void;
  axes: TonePadAxes;
  /** Keyboard step on each axis, as a fraction (default 0.1). */
  step?: number;
  disabled?: boolean;
}

const clamp = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
const percent = (n: number) => Math.round(clamp(n) * 100);

/**
 * Two choices on one square: drag the handle, or use the two sliders it is made of. Each
 * axis is a native range input with its own name, so keyboard and screen-reader users set
 * the same two numbers the pointer does.
 */
export function TonePad({
  label,
  value,
  onValueChange,
  axes,
  step = 0.1,
  className = '',
  ...props
}: TonePadProps) {
  const id = useId();
  const field = useFieldControl(props);
  const pad = useRef<HTMLDivElement>(null);
  const x = clamp(value.x);
  const y = clamp(value.y);
  const disabled = field.disabled ?? false;
  function fromPointer(event: PointerEvent<HTMLDivElement>) {
    const box = pad.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return;
    onValueChange({
      x: clamp((event.clientX - box.left) / box.width),
      y: clamp(1 - (event.clientY - box.top) / box.height),
    });
  }
  const describe = `${axes.x[0]} to ${axes.x[1]} ${percent(x)}%, ${axes.y[0]} to ${axes.y[1]} ${percent(y)}%`;
  return (
    <div
      {...props}
      role="group"
      aria-labelledby={field['aria-labelledby'] ?? (label ? `${id}-label` : undefined)}
      aria-describedby={field['aria-describedby']}
      data-part="tone-pad"
      data-disabled={disabled || undefined}
      className={`${css.root} ${className}`}
    >
      {label && !field['aria-labelledby'] && (
        <span id={`${id}-label`} className={css.srOnly}>
          {label}
        </span>
      )}
      <span className={css.top} aria-hidden="true">
        {axes.y[1]}
      </span>
      <span className={css.left} aria-hidden="true">
        {axes.x[0]}
      </span>
      <div
        ref={pad}
        className={css.pad}
        aria-hidden="true"
        onPointerDown={(event) => {
          if (disabled || event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          fromPointer(event);
        }}
        onPointerMove={(event) => {
          if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          fromPointer(event);
        }}
      >
        <span className={css.line} data-axis="x" style={{ left: `${x * 100}%` }} />
        <span className={css.line} data-axis="y" style={{ top: `${(1 - y) * 100}%` }} />
        <span className={css.handle} style={{ left: `${x * 100}%`, top: `${(1 - y) * 100}%` }} />
      </div>
      <span className={css.right} aria-hidden="true">
        {axes.x[1]}
      </span>
      <span className={css.bottom} aria-hidden="true">
        {axes.y[0]}
      </span>
      <div className={css.inputs}>
        <label>
          <span className={css.srOnly}>
            {axes.x[0]} to {axes.x[1]}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={Math.max(1, Math.round(step * 100))}
            value={percent(x)}
            disabled={disabled}
            aria-valuetext={`${percent(x)}% toward ${axes.x[1]}`}
            onChange={(event) => onValueChange({ x: Number(event.target.value) / 100, y })}
          />
        </label>
        <label>
          <span className={css.srOnly}>
            {axes.y[0]} to {axes.y[1]}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={Math.max(1, Math.round(step * 100))}
            value={percent(y)}
            disabled={disabled}
            aria-valuetext={`${percent(y)}% toward ${axes.y[1]}`}
            onChange={(event) => onValueChange({ x, y: Number(event.target.value) / 100 })}
          />
        </label>
      </div>
      <span className={css.srOnly} aria-live="polite">
        {describe}
      </span>
    </div>
  );
}
