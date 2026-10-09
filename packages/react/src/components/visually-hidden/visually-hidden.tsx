import type { ComponentProps } from 'react';
import s from '../../shared/styles/styles.module.css';

export type VisuallyHiddenProps = ComponentProps<'span'>;

/** Text for assistive technology only. It stays in the accessibility tree and in selection. */
export function VisuallyHidden({ className = '', ...props }: VisuallyHiddenProps) {
  return <span {...props} className={`${s.srOnly} ${className}`} />;
}
