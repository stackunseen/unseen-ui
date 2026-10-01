'use client';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { useFieldControl } from '../field/field.js';
import s from '../../shared/styles/form-controls.module.css';

export type TextareaProps = ComponentPropsWithoutRef<'textarea'>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className = '', rows = 3, ...props },
  ref,
) {
  const field = useFieldControl(props);
  return (
    <textarea
      {...props}
      {...field}
      ref={ref}
      rows={rows}
      className={`${s.input} ${s.textarea} ${className}`}
    />
  );
});
