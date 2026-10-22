'use client';
import { Slot } from '@radix-ui/react-slot';
import type { ComponentProps } from 'react';
import { Anchor } from '../../shared/link.js';
import s from '../../shared/styles/styles.module.css';

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
  size?: 'default' | 'sm';
  /**
   * Renders a link with Button's presentation, for calls to action that navigate. With a
   * LinkProvider it is the host's router link; otherwise a native anchor, where modified
   * clicks, target and rel keep their browser behaviour.
   */
  href?: string;
  /** With href. */
  target?: string;
  /** With href. */
  rel?: string;
  /**
   * Render the single child element instead of a button, passing it the button's presentation.
   * Use it for a one-off link component; the child keeps its own semantics, href, target and rel.
   */
  asChild?: boolean;
}
export function Button({
  variant = 'primary',
  size = 'default',
  asChild = false,
  className = '',
  type = 'button',
  href,
  target,
  rel,
  ...props
}: ButtonProps) {
  const presentation = {
    // A stable styling hook: components style the Buttons they contain with [data-button], so those
    // rules can live in their own stylesheets (see ADR 0028). data-part stays free for callers.
    'data-button': '',
    'data-variant': variant,
    'data-size': size,
    className: `${s.button} ${className}`,
  };
  if (asChild) return <Slot {...props} {...presentation} />;
  if (href !== undefined) {
    const anchorProps = props as unknown as Omit<ComponentProps<'a'>, 'href'>;
    return <Anchor {...anchorProps} href={href} target={target} rel={rel} {...presentation} />;
  }
  return <button {...props} type={type} {...presentation} />;
}
