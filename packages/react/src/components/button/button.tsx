'use client';
import { Slot } from '@radix-ui/react-slot';
import type { ComponentProps } from 'react';
import s from '../../shared/styles/styles.module.css';

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
  size?: 'default' | 'sm';
  /**
   * Render the single child element instead of a button, passing it the button's presentation.
   * Use it for router links; the child keeps its own semantics, href, target and rel.
   */
  asChild?: boolean;
}
export function Button({
  variant = 'primary',
  size = 'default',
  asChild = false,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const presentation = {
    'data-variant': variant,
    'data-size': size,
    className: `${s.button} ${className}`,
  };
  if (asChild) return <Slot {...props} {...presentation} />;
  return <button {...props} type={type} {...presentation} />;
}
