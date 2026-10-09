import type { ComponentProps } from 'react';
import d from '../../shared/styles/display.module.css';

export type KbdProps = ComponentProps<'kbd'>;

/** One keyboard key, such as "Esc" or "⌘". Combine several for a shortcut. */
export function Kbd({ className = '', ...props }: KbdProps) {
  return <kbd {...props} className={`${d.kbd} ${className}`} />;
}
