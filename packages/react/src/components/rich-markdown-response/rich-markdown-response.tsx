'use client';
import type { ReactNode } from 'react';
import remarkMath from 'remark-math';
import type { ExtraProps } from 'react-markdown';
import {
  MarkdownResponse as Renderer,
  useMarkdownStreaming,
  ParsedCodeBlock,
} from '../markdown-response/markdown-response.js';
import type {
  MarkdownResponseProps,
  MarkdownExtensions,
} from '../markdown-response/markdown-response.js';
import { MathFormula } from '../math-formula/math-formula.js';
import { MermaidDiagram } from '../mermaid-diagram/mermaid-diagram.js';
export { MathFormula } from '../math-formula/math-formula.js';
export type { MathFormulaProps } from '../math-formula/math-formula.js';
export { MermaidDiagram } from '../mermaid-diagram/mermaid-diagram.js';
export type { MermaidDiagramProps } from '../mermaid-diagram/mermaid-diagram.js';

function RichCode({ node, children }: { children?: ReactNode } & ExtraProps) {
  const classes = node?.properties.className;
  if (Array.isArray(classes) && classes.includes('math-inline'))
    return (
      <MathFormula
        formula={
          node?.children.map((child) => (child.type === 'text' ? child.value : '')).join('') ?? ''
        }
        variant="inline"
      />
    );
  return <code>{children}</code>;
}
function RichPre({ node, children }: { children?: ReactNode } & ExtraProps) {
  const streaming = useMarkdownStreaming();
  const code = node?.children.find((child) => child.type === 'element' && child.tagName === 'code');
  const classes = code?.type === 'element' ? code.properties.className : undefined;
  const text =
    code?.type === 'element'
      ? code.children
          .map((child) => (child.type === 'text' ? child.value : ''))
          .join('')
          .replace(/\n$/, '')
      : '';
  if (Array.isArray(classes) && classes.includes('language-mermaid'))
    return <MermaidDiagram code={text} state={streaming ? 'streaming' : 'complete'} />;
  if (Array.isArray(classes) && classes.includes('math-display'))
    return <MathFormula formula={text} />;
  return <ParsedCodeBlock node={node}>{children}</ParsedCodeBlock>;
}
const extensions: MarkdownExtensions = {
  remarkPlugins: [remarkMath],
  components: { pre: RichPre, code: RichCode },
};
export function RichMarkdownResponse(props: MarkdownResponseProps) {
  return <Renderer {...props} extensions={extensions} />;
}
