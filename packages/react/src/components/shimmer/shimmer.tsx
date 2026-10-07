import type { ReactNode } from 'react';
import s from '../../shared/styles/assistant.module.css';

export interface ShimmerProps {
  children: ReactNode;
  /** Element to render; defaults to an inline span. */
  as?: 'span' | 'p' | 'div';
  className?: string;
}

/** Animated text for in-progress labels. Motion stops under reduced-motion preferences. */
export function Shimmer({ children, as: Tag = 'span', className = '' }: ShimmerProps) {
  return (
    <Tag className={`${s.shimmer} ${className}`} data-part="shimmer">
      {children}
    </Tag>
  );
}
