'use client';
import type { ComponentProps } from 'react';
import { Button } from '../button/button.js';
import type { ButtonProps } from '../button/button.js';
import { useFieldControl } from '../field/field.js';
import s from './input-group.module.css';

export interface InputGroupProps extends ComponentProps<'div'> {
  /** Flush fills the end cap with the button; inset keeps an even gap around it. */
  attach?: 'flush' | 'inset';
  /** Touch gives a 44px target. */
  size?: 'default' | 'touch';
  /** The control radius token, or the pill radius token. */
  shape?: 'control' | 'pill';
  invalid?: boolean;
  /** Dims the whole group; the input and button keep their own disabled state. */
  disabled?: boolean;
}

/**
 * One bordered control holding an input and its action. The group draws the single border,
 * radius and focus ring (through :focus-within), so the input never shows a second ring.
 * Works inside Field, which supplies invalid and disabled, and in a native form without
 * JavaScript.
 */
export function InputGroup({
  attach = 'flush',
  size = 'default',
  shape = 'control',
  invalid,
  disabled,
  className = '',
  ...props
}: InputGroupProps) {
  const field = useFieldControl({ 'aria-invalid': invalid || undefined, disabled });
  return (
    <div
      {...props}
      data-part="input-group"
      data-attach={attach}
      data-size={size}
      data-shape={shape}
      data-invalid={field['aria-invalid'] ? 'true' : undefined}
      data-disabled={field.disabled || undefined}
      className={`${s.group} ${className}`}
    />
  );
}

export type InputGroupAddonProps = ComponentProps<'span'>;
/** A prefix or suffix such as an icon, a currency sign or a domain. */
export function InputGroupAddon({ className = '', ...props }: InputGroupAddonProps) {
  return <span {...props} data-part="input-group-addon" className={`${s.addon} ${className}`} />;
}

export type InputGroupButtonProps = ButtonProps;
/** The action at the end of the group; keeps its own visible keyboard focus inside the border. */
export function InputGroupButton({ className = '', ...props }: InputGroupButtonProps) {
  return (
    <Button {...props} data-part="input-group-button" className={`${s.button} ${className}`} />
  );
}
