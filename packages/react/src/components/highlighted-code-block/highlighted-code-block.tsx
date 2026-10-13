'use client';
import { forwardRef } from 'react';
import { CodeBlockView } from '../code-block/code-block.js';
import type { CodeBlockHandle, MarkdownCodeBlockProps } from '../code-block/code-block.js';
export type { CodeBlockHandle } from '../code-block/code-block.js';
import { useCodeHighlight } from '../../shared/code-highlighting/use-code-highlight.js';
export { HighlightedCodeDiff } from '../highlighted-code-diff/highlighted-code-diff.js';
export type { HighlightedCodeDiffProps } from '../highlighted-code-diff/highlighted-code-diff.js';

export interface HighlightedCodeBlockProps extends MarkdownCodeBlockProps {
  /** Disable tokenization without changing the code presentation/copy contract. */
  highlight?: boolean;
}
export const HighlightedCodeBlock = forwardRef<CodeBlockHandle, HighlightedCodeBlockProps>(
  function HighlightedCodeBlock({ highlight = true, ...props }, ref) {
    const result = useCodeHighlight({ ...props, highlight });
    return (
      <CodeBlockView
        {...props}
        ref={ref}
        lines={result.lines}
        notice={result.notice}
        highlighting={result.state}
      />
    );
  },
);
