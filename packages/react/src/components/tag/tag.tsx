import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import s from '../../shared/styles/styles.module.css';
import d from '../../shared/styles/display.module.css';

export type TagTone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning';
export interface TagProps extends ComponentProps<'span'> {
  /** Colour meaning is the application's; the tag adds no status semantics. */
  tone?: TagTone;
  /** A custom hue (any CSS colour) mixed into the surface and text in place of a tone. */
  hue?: string;
  size?: 'default' | 'sm';
  /** Monospace for identifiers and metadata. */
  mono?: boolean;
  /** Decorative icon before the label. */
  icon?: ReactNode;
}

/** A neutral label for categories, levels and other application-defined groupings. */
export function Tag({
  tone = 'neutral',
  hue,
  size = 'default',
  mono = false,
  icon,
  className = '',
  style,
  children,
  ...props
}: TagProps) {
  return (
    <span
      {...props}
      style={hue ? ({ ...style, '--tag-hue': hue } as CSSProperties) : style}
      data-tone={hue ? 'hue' : tone}
      data-size={size}
      data-mono={mono || undefined}
      data-part="tag"
      className={`${s.badge} ${d.badge} ${className}`}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
