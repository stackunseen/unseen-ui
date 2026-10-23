'use client';
import type { ComponentProps } from 'react';
import { CopyButton } from '@stackunseen/ui';
import { textOf } from '../lib/text-of';

/** A code block from the guides with a copy button in its corner. */
export function CodePanel({ children, className = '', ...props }: ComponentProps<'pre'>) {
  const text = textOf(children).replace(/\n$/, '');
  return (
    <div className="code-panel">
      <pre tabIndex={0} {...props} className={className}>
        {children}
      </pre>
      {text && (
        <CopyButton
          size="sm"
          variant="ghost"
          iconOnly
          value={text}
          label="Copy code"
          className="code-panel-copy"
        />
      )}
    </div>
  );
}
