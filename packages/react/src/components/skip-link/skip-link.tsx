import type { ComponentProps } from 'react';
import d from '../../shared/styles/display.module.css';

export interface SkipLinkProps extends ComponentProps<'a'> {
  /** The id of the main content region, with or without a leading hash. */
  href: string;
}

/**
 * A link to the main content that is visually hidden until focused. Place it first in the
 * document. The target should be focusable (tabIndex={-1}) so focus lands inside it.
 */
export function SkipLink({
  className = '',
  children = 'Skip to content',
  ...props
}: SkipLinkProps) {
  return (
    <a {...props} className={`${d.skipLink} ${className}`}>
      {children}
    </a>
  );
}
