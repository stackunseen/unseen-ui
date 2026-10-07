'use client';
import { CopyIcon } from '@radix-ui/react-icons';
import { useCopy } from '../../shared/copy.js';
import s from '../../shared/styles/devtools.module.css';

export interface SnippetProps {
  /** A single command or short code line shown as text, never executed. */
  code: string;
  /** Visual prompt prefix such as "$". Not included when copying. */
  prefix?: string;
  label?: string;
  className?: string;
}

/** An inline command with a copy button. */
export function Snippet({ code, prefix, label = 'Command', className = '' }: SnippetProps) {
  const { copy, message } = useCopy();
  const status = message(code);
  return (
    <div
      className={`${s.snippet} ${className}`}
      data-part="snippet"
      role="group"
      aria-label={label}
    >
      <code className={s.mono}>
        {prefix && <span aria-hidden="true">{prefix} </span>}
        {code}
      </code>
      <button
        type="button"
        className={s.iconButton}
        aria-label={`Copy ${label.toLocaleLowerCase()}`}
        onClick={() => void copy(code)}
      >
        <CopyIcon aria-hidden="true" />
      </button>
      <span role="status" className={status ? s.meta : s.srOnly}>
        {status}
      </span>
    </div>
  );
}
