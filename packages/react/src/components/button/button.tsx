'use client';
import type { ComponentProps } from 'react';
import s from '../../shared/styles/styles.module.css';

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'default' | 'sm';
}
export function Button({
  variant = 'primary',
  size = 'default',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      data-variant={variant}
      data-size={size}
      className={`${s.button} ${className}`}
    />
  );
}
