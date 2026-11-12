'use client';
import type { ComponentProps } from 'react';
import { CopyButton } from '../copy-button/copy-button.js';
import s from '../../shared/styles/devtools.module.css';

export interface SnippetProps extends ComponentProps<'div'> {
  /** A single command or short code line shown as text, never executed. */
  code: string;
  /** Visual prompt prefix such as "$". Not included when copying. */
  prefix?: string;
  label?: string;
  className?: string;
}

/** An inline command with a copy button. */
export function Snippet({
  code,
  prefix,
  label = 'Command',
  className = '',
  ...rest
}: SnippetProps) {
  return (
    <div
      {...rest}
      className={`${s.snippet} ${className}`}
      data-part="snippet"
      role="group"
      aria-label={label}
    >
      <code className={s.mono}>
        {prefix && <span aria-hidden="true">{prefix} </span>}
        {code}
      </code>
      <CopyButton
        value={code}
        label={`Copy ${label.toLocaleLowerCase()}`}
        iconOnly
        variant="ghost"
        size="sm"
      />
    </div>
  );
}
