'use client';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Field, useFieldControl } from '../field/field.js';
import s from '../../shared/styles/form-controls.module.css';

export interface SwitchProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'role'> {
  onCheckedChange?: (checked: boolean) => void;
  /**
   * A visible label beside the switch. The switch then renders its own horizontal Field, so do
   * not also wrap it in one; use Field directly when you need an error message.
   */
  label?: ReactNode;
  /** Help text under the label, announced as the switch's description. Needs label. */
  description?: ReactNode;
}

const SwitchControl = forwardRef<HTMLInputElement, Omit<SwitchProps, 'label' | 'description'>>(
  function SwitchControl({ onCheckedChange, onChange, className = '', ...props }, ref) {
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
  },
);

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, description, ...props },
  ref,
) {
  if (label === undefined || label === null) return <SwitchControl {...props} ref={ref} />;
  return (
    <Field
      id={props.id}
      label={label}
      description={description}
      orientation="horizontal"
      disabled={props.disabled}
    >
      <SwitchControl {...props} id={undefined} ref={ref} />
    </Field>
  );
});
