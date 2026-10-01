'use client';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { useFieldControl } from '../field/field.js';
import s from '../../shared/styles/form-controls.module.css';

export type InputProps = ComponentPropsWithoutRef<'input'>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', type = 'text', ...props },
  ref,
) {
  const field = useFieldControl(props);
  return (
    <input {...props} {...field} ref={ref} type={type} className={`${s.input} ${className}`} />
  );
});
