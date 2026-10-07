import type { ComponentProps } from 'react';
import s from '../../shared/styles/styles.module.css';

export interface LinkButtonProps extends ComponentProps<'a'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'default' | 'sm';
}

/**
 * A native anchor with Button's presentation. Modified clicks, target and rel keep their
 * browser behaviour; use Button with asChild when a router link component must render.
 */
export function LinkButton({
  variant = 'primary',
  size = 'default',
  className = '',
  ...props
}: LinkButtonProps) {
  return (
    <a
      {...props}
      data-variant={variant}
      data-size={size}
      data-part="link-button"
      className={`${s.button} ${className}`}
    />
  );
}
