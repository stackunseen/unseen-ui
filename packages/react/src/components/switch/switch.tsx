'use client';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { useFieldControl } from '../field/field.js';
import s from '../../shared/styles/form-controls.module.css';

export interface SwitchProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'role'> {
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { onCheckedChange, onChange, className = '', ...props },
  ref,
) {
  const field = useFieldControl(props);
  return (
    <input
      {...props}
      {...field}
      ref={ref}
      type="checkbox"
      role="switch"
      className={`${s.switch} ${className}`}
      onChange={(event) => {
        onChange?.(event);
        if (!event.defaultPrevented) onCheckedChange?.(event.currentTarget.checked);
      }}
    />
  );
});
