'use client';
import { MarkdownResponse as Renderer } from './markdown-response.js';
import type { MarkdownResponseProps } from './markdown-response.js';
export type { MarkdownResponseProps } from './markdown-response.js';
export { renderMarkdownPart } from './markdown-response.js';
export function MarkdownResponse(props: MarkdownResponseProps) {
  return <Renderer {...props} />;
}

export { MarkdownCodeBlock } from '../code-block/code-block.js';
export type { MarkdownCodeBlockProps } from '../code-block/code-block.js';
