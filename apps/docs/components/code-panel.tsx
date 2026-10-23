'use client';
import { isValidElement } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { HighlightedCodeBlock } from '@stackunseen/ui/highlight';
import { textOf } from '../lib/text-of';

/** The language a Markdown fence names, from the `language-tsx` class on its code element. */
function languageOf(children: ReactNode) {
  const className = isValidElement<{ className?: string }>(children)
    ? (children.props.className ?? '')
    : '';
  return /(?:^|\s)language-([\w-]+)/.exec(className)?.[1];
}

/**
 * A code block from the guides: the library's highlighted block, with the language and a copy
 * button in its header. The colors load after the text, so the code is readable straight away.
 */
export function CodePanel({ children, language }: ComponentProps<'pre'> & { language?: string }) {
  const code = textOf(children).replace(/\n$/, '');
  return (
    <div className="guide-code">
      <HighlightedCodeBlock code={code} language={language ?? languageOf(children)} />
    </div>
  );
}
