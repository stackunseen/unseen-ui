'use client';
import { forwardRef, useId } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { joinIds, useFieldControl } from '../field/field.js';
import s from '../../shared/styles/form-controls.module.css';

export interface RadioGroupOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps extends Omit<
  ComponentPropsWithoutRef<'fieldset'>,
  'defaultValue' | 'children'
> {
  options: readonly RadioGroupOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  orientation?: 'horizontal' | 'vertical';
  emptyMessage?: ReactNode;
  /** An external form owner, matching the native inputs' form attribute. */
  form?: string;
}

export const RadioGroup = forwardRef<HTMLFieldSetElement, RadioGroupProps>(function RadioGroup(
  {
    options,
    value,
    defaultValue,
    onValueChange,
    name,
    required: requiredProp,
    orientation = 'vertical',
    emptyMessage = 'No options available.',
    className = '',
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const field = useFieldControl({ ...props, required: requiredProp });
  const groupName = name ?? `radio-${generatedId}`;
  const { required, ...groupProps } = field;
  return (
    <fieldset
      {...props}
      {...groupProps}
      ref={ref}
      className={`${s.radioGroup} ${className}`}
      data-orientation={orientation}
    >
      {options.length === 0 ? (
        <span className={s.description}>{emptyMessage}</span>
      ) : (
        options.map((option, index) => {
          const id = `${generatedId}-${index}`;
          return (
            <label key={option.value} className={s.radioOption}>
              <input
                type="radio"
                name={groupName}
                value={option.value}
                form={props.form}
                checked={value === undefined ? undefined : value === option.value}
                defaultChecked={value === undefined ? defaultValue === option.value : undefined}
                disabled={field.disabled || option.disabled}
                required={required}
                aria-labelledby={`${id}-label`}
                aria-invalid={field['aria-invalid']}
                aria-describedby={joinIds(
                  field['aria-describedby'],
                  option.description ? `${id}-description` : undefined,
                )}
                onChange={(event) => {
                  if (event.target.checked) onValueChange?.(option.value);
                }}
              />
              <span>
                <span id={`${id}-label`}>{option.label}</span>
                {option.description && (
                  <span id={`${id}-description`} className={s.description}>
                    {option.description}
                  </span>
                )}
              </span>
            </label>
          );
        })
      )}
    </fieldset>
  );
});
