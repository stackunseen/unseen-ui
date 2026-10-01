'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { useFieldControl } from '../field/field.js';
import s from '../../shared/styles/form-controls.module.css';

export interface CheckboxProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type'> {
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { indeterminate = false, onCheckedChange, onChange, className = '', ...props },
  forwardedRef,
) {
  const field = useFieldControl(props);
  const ref = useRef<HTMLInputElement>(null);
  useImperativeHandle(forwardedRef, () => ref.current!);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      {...props}
      {...field}
      ref={ref}
      type="checkbox"
      className={`${s.checkbox} ${className}`}
      onChange={(event) => {
        onChange?.(event);
        if (!event.defaultPrevented) onCheckedChange?.(event.currentTarget.checked);
        // Browsers clear mixed state on activation; the host still owns this prop.
        event.currentTarget.indeterminate = indeterminate;
      }}
    />
  );
});
