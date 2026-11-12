import type { ComponentProps, ReactNode } from 'react';
import s from '../../shared/styles/assistant.module.css';

export interface ShimmerProps extends ComponentProps<'span'> {
  children: ReactNode;
  /** Element to render; defaults to an inline span. */
  as?: 'span' | 'p' | 'div';
  className?: string;
}

/** Animated text for in-progress labels. Motion stops under reduced-motion preferences. */
export function Shimmer({ children, as = 'span', className = '', ...rest }: ShimmerProps) {
  // The three tags take the same attributes; only the ref's element type differs.
  const Tag = as as 'span';
  return (
    <Tag {...rest} className={`${s.shimmer} ${className}`} data-part="shimmer">
      {children}
    </Tag>
  );
}
