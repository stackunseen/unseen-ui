'use client';
import { CodeBlockView } from '../code-block/code-block.js';
import type { MarkdownCodeBlockProps } from '../code-block/code-block.js';
import { useCodeHighlight } from '../../shared/code-highlighting/use-code-highlight.js';
export { HighlightedCodeDiff } from '../highlighted-code-diff/highlighted-code-diff.js';
export type { HighlightedCodeDiffProps } from '../highlighted-code-diff/highlighted-code-diff.js';

export interface HighlightedCodeBlockProps extends MarkdownCodeBlockProps {
  /** Disable tokenization without changing the code presentation/copy contract. */
  highlight?: boolean;
}
export function HighlightedCodeBlock({ highlight = true, ...props }: HighlightedCodeBlockProps) {
  const result = useCodeHighlight({ ...props, highlight });
  return (
    <CodeBlockView
      {...props}
      lines={result.lines}
      notice={result.notice}
      highlighting={result.state}
    />
  );
}
