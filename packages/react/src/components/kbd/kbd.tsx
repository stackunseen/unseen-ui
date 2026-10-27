import type { ComponentProps } from 'react';
import css from './kbd.module.css';

export interface KbdProps extends ComponentProps<'kbd'> {
  /** sm for hints beside small text. */
  size?: 'default' | 'sm';
}

/**
 * One key cap, such as Enter, ⌘ or S. Put each key of a combination in its own Kbd and the
 * joining "+" as text between them, so screen readers hear the keys as words.
 */
export function Kbd({ size = 'default', className = '', ...props }: KbdProps) {
  return <kbd {...props} data-size={size} className={`${css.key} ${className}`} />;
}
