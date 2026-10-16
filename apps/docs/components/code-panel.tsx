'use client';
import { Children, isValidElement } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { CopyButton } from '@stackunseen/ui';

/** Collects the text a code block renders so a copy button can offer it. */
export function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node))
    return Children.toArray(node.props.children).map(textOf).join('');
  return '';
}

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
