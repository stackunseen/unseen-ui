'use client';
import { forwardRef, useState } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { useFieldControl } from '../field/field.js';
import s from '../../shared/styles/form-controls.module.css';

export interface SliderProps extends Omit<
  ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
  'children' | 'asChild'
> {
  /** Distinguish each thumb when a range has multiple values. */
  thumbLabels?: readonly string[];
  /** Include meaningful units, e.g. "20 minutes". */
  getValueLabel?: (value: number, index: number) => string;
}
export const Slider = forwardRef<HTMLSpanElement, SliderProps>(function Slider(
  {
    value,
    defaultValue,
    min = 0,
    thumbLabels,
    getValueLabel,
    onValueChange,
    className = '',
    ...props
  },
  ref,
) {
  const field = useFieldControl(props);
  const [uncontrolledValues, setUncontrolledValues] = useState(() => defaultValue ?? [min]);
  const values = value ?? uncontrolledValues;
  return (
    <SliderPrimitive.Root
      {...props}
      id={field.id}
      disabled={field.disabled}
      role="group"
      aria-labelledby={field['aria-labelledby']}
      aria-describedby={field['aria-describedby']}
      ref={ref}
      min={min}
      value={value}
      defaultValue={defaultValue}
      className={`${s.slider} ${className}`}
      onValueChange={(next) => {
        if (value === undefined) setUncontrolledValues(next);
        onValueChange?.(next);
      }}
    >
      <SliderPrimitive.Track className={s.track}>
        <SliderPrimitive.Range className={s.range} />
      </SliderPrimitive.Track>
      {values.map((current, index) => (
        <SliderPrimitive.Thumb
          key={index}
          className={s.thumb}
          aria-label={
            thumbLabels?.[index] ??
            (values.length > 1
              ? `${props['aria-label'] ?? 'Value'} ${index + 1}`
              : props['aria-label'])
          }
          aria-labelledby={
            thumbLabels?.[index] || values.length > 1 ? undefined : field['aria-labelledby']
          }
          aria-describedby={field['aria-describedby']}
          aria-invalid={field['aria-invalid']}
          aria-valuetext={getValueLabel?.(current, index)}
        />
      ))}
    </SliderPrimitive.Root>
  );
});
