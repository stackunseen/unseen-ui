'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Field, useFieldControl } from '../field/field.js';
import s from '../../shared/styles/form-controls.module.css';

export interface CheckboxProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type'> {
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /**
   * A visible label beside the box. The checkbox then renders its own horizontal Field, so do not
   * also wrap it in one; use Field directly when you need an error message.
   */
  label?: ReactNode;
  /** Help text under the label, announced as the checkbox's description. Needs label. */
  description?: ReactNode;
}

const CheckboxControl = forwardRef<HTMLInputElement, Omit<CheckboxProps, 'label' | 'description'>>(
  function CheckboxControl(
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
  },
);

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, ...props },
  ref,
) {
  if (label === undefined || label === null) return <CheckboxControl {...props} ref={ref} />;
  return (
    <Field
      id={props.id}
      label={label}
      description={description}
      orientation="horizontal"
      disabled={props.disabled}
    >
      <CheckboxControl {...props} id={undefined} ref={ref} />
    </Field>
  );
});
