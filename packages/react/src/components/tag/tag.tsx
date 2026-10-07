import type { ComponentProps, ReactNode } from 'react';
import s from '../../shared/styles/styles.module.css';
import d from '../../shared/styles/display.module.css';

export type TagTone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning';
export interface TagProps extends ComponentProps<'span'> {
  /** Colour meaning is the application's; the tag adds no status semantics. */
  tone?: TagTone;
  size?: 'default' | 'sm';
  /** Decorative icon before the label. */
  icon?: ReactNode;
}

/** A neutral label for categories, levels and other application-defined groupings. */
export function Tag({
  tone = 'neutral',
  size = 'default',
  icon,
  className = '',
  children,
  ...props
}: TagProps) {
  return (
    <span
      {...props}
      data-tone={tone}
      data-size={size}
      data-part="tag"
      className={`${s.badge} ${d.badge} ${className}`}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
