import { Children, isValidElement } from 'react';
import type { ReactNode } from 'react';

/** Collects the text an element renders, for copy buttons and heading ids. */
export function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node))
    return Children.toArray(node.props.children).map(textOf).join('');
  return '';
}
