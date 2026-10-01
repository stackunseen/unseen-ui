'use client';
import { createContext, forwardRef, useContext, useId } from 'react';
import type { AriaAttributes, ComponentPropsWithoutRef, ReactNode } from 'react';
import s from '../../shared/styles/form-controls.module.css';

interface FieldContextValue {
  id: string;
  labelId: string;
  describedBy?: string;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
}
const FieldContext = createContext<FieldContextValue | undefined>(undefined);

export interface FieldProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** A Field labels one control. Its id is the control id, not the outer div id. */
  label: ReactNode;
  /** Use "span" for grouped/range controls; their group/thumbs use aria-labelledby. */
  labelAs?: 'label' | 'span';
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  children: ReactNode;
}

export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  {
    id,
    label,
    labelAs = 'label',
    description,
    error,
    required,
    disabled,
    invalid,
    children,
    className = '',
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const controlId = id ?? `field-${generatedId}`;
  const hasDescription = description !== undefined && description !== null && description !== false;
  const hasError = error !== undefined && error !== null && error !== false && error !== '';
  const value: FieldContextValue = {
    id: controlId,
    labelId: `${controlId}-label`,
    describedBy: joinIds(
      hasDescription ? `${controlId}-description` : undefined,
      hasError ? `${controlId}-error` : undefined,
    ),
    required,
    disabled,
    invalid: invalid ?? hasError,
  };
  return (
    <FieldContext.Provider value={value}>
      <div
        {...props}
        ref={ref}
        className={`${s.field} ${className}`}
        data-disabled={disabled || undefined}
      >
        {labelAs === 'label' ? (
          <label id={value.labelId} htmlFor={controlId} className={s.label}>
            {label}
            {required && <span aria-hidden="true"> *</span>}
          </label>
        ) : (
          <span id={value.labelId} className={s.label}>
            {label}
            {required && <span aria-hidden="true"> *</span>}
          </span>
        )}
        {children}
        {hasDescription && (
          <div id={`${controlId}-description`} className={s.description}>
            {description}
          </div>
        )}
        {hasError && (
          <div id={`${controlId}-error`} className={s.error}>
            {error}
          </div>
        )}
      </div>
    </FieldContext.Provider>
  );
});

export function joinIds(...values: (string | undefined)[]) {
  return (
    [...new Set(values.flatMap((value) => value?.split(/\s+/).filter(Boolean) ?? []))].join(' ') ||
    undefined
  );
}

export function useFieldControl(
  props: AriaAttributes & { id?: string; disabled?: boolean; required?: boolean },
) {
  const field = useContext(FieldContext);
  return {
    id: props.id ?? field?.id,
    disabled: props.disabled || field?.disabled,
    required: props.required ?? field?.required,
    'aria-invalid': props['aria-invalid'] ?? (field?.invalid || undefined),
    'aria-describedby': joinIds(props['aria-describedby'], field?.describedBy),
    'aria-labelledby':
      props['aria-labelledby'] ?? (props['aria-label'] ? undefined : field?.labelId),
  };
}
