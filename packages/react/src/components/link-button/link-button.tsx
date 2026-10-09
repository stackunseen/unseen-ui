import type { ComponentProps } from 'react';
import { Anchor } from '../../shared/link.js';
import s from '../../shared/styles/styles.module.css';

export interface LinkButtonProps extends ComponentProps<'a'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'default' | 'sm';
}

/**
 * An anchor with Button's presentation. With a LinkProvider it renders the host's router
 * link; otherwise a native anchor, where modified clicks, target and rel keep their browser
 * behaviour. Button with asChild remains available for a one-off link component.
 */
export function LinkButton({
  variant = 'primary',
  size = 'default',
  className = '',
  href,
  ...props
}: LinkButtonProps) {
  const shared = {
    ...props,
    'data-variant': variant,
    'data-size': size,
    'data-part': 'link-button',
    className: `${s.button} ${className}`,
  };
  return href === undefined ? <a {...shared} /> : <Anchor {...shared} href={href} />;
}
