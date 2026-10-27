import type { ComponentProps, ReactNode } from 'react';
import d from '../../shared/styles/display.module.css';

export interface NumericProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** A formatted figure from the application, such as "11.4 h" or "820 ms"; never computed here. */
  value: ReactNode;
  /** What the figure means or compares to, in words: "vs September", "per run", "of 3 h". */
  qualifier?: ReactNode;
  /** lg for a card's headline figure, md for a row figure, sm for meta beside text. */
  size?: 'lg' | 'md' | 'sm';
  /** Colour that backs up a sign already in the text; neutral by default. */
  tone?: 'neutral' | 'up' | 'down' | 'primary';
}

/**
 * A figure in the numeric face with tabular digits, and its qualifier in words beside it.
 * Stat, ElapsedTime and ToolCall durations share the same style, so numbers line up across a
 * screen. Renders on the server; no state or runtime.
 */
export function Numeric({
  value,
  qualifier,
  size = 'md',
  tone = 'neutral',
  className = '',
  ...props
}: NumericProps) {
  return (
    <span
      {...props}
      data-part="numeric"
      data-size={size}
      data-tone={tone === 'neutral' ? undefined : tone}
      className={`${d.numericRow} ${className}`}
    >
      <span className={d.numeric}>{value}</span>
      {qualifier !== undefined && qualifier !== null && (
        <span className={d.qualifier}>{qualifier}</span>
      )}
    </span>
  );
}
