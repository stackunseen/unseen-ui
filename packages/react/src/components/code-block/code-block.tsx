'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { IconButton } from '../icon-button/icon-button.js';
import s from './code-block.module.css';
import { CodeTokenLine } from '../../shared/code-highlighting/code-tokens.js';
import type { CodeToken } from '../../shared/code-highlighting/code-tokens.js';

export interface MarkdownCodeBlockProps {
  code: string;
  language?: string;
  streaming?: boolean;
  variant?: 'panel' | 'minimal' | 'numbered';
  /** Inclusive 1-based line ranges to mark, such as a tour stop. Deterministic: lines keep their elements while tokens settle. */
  highlightLines?: readonly (readonly [number, number])[];
  /** Scrolls this 1-based line near the top of the code pane, never the page, whenever it changes. */
  scrollToLine?: number;
}
/** Imperative access to the code pane; the same scroll the scrollToLine prop performs. */
export interface CodeBlockHandle {
  scrollToLine: (line: number) => void;
}
/** Internal presentation shared by the plain and optional highlighted entries. */
export const CodeBlockView = forwardRef<
  CodeBlockHandle,
  MarkdownCodeBlockProps & {
    lines?: readonly (readonly CodeToken[])[];
    notice?: string;
    highlighting?: string;
  }
>(function CodeBlockView(
  {
    code,
    language,
    streaming,
    variant = 'panel',
    highlightLines,
    scrollToLine,
    lines,
    notice,
    highlighting,
  },
  ref,
) {
  const text = code.slice(0, 100000);
  const pre = useRef<HTMLPreElement>(null);
  const scrollTo = (line: number) => {
    const scroller = pre.current;
    const target = scroller?.querySelector<HTMLElement>(
      `[data-line="${Math.max(1, Math.floor(line))}"]`,
    );
    if (!scroller || !target) return;
    scroller.scrollTop = Math.max(
      0,
      scroller.scrollTop +
        target.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top -
        24,
    );
  };
  useImperativeHandle(ref, () => ({ scrollToLine: scrollTo }), []);
  useEffect(() => {
    if (scrollToLine !== undefined) scrollTo(scrollToLine);
  }, [scrollToLine, code]);
  const marked = (line: number) =>
    highlightLines?.some(([start, end]) => line >= start && line <= end) || undefined;
  const [feedback, setFeedback] = useState<{ code: string; language?: string; message: string }>();
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current += 1;
    },
    [code, language],
  );
  const label = language?.slice(0, 40) || 'Plain text';
  async function copy() {
    const attempt = ++request.current;
    try {
      await navigator.clipboard.writeText(code);
      if (request.current === attempt) setFeedback({ code, language, message: 'Code copied' });
    } catch {
      if (request.current === attempt)
        setFeedback({ code, language, message: 'Copy unavailable. Select and copy the code.' });
    }
  }
  const sourceLines = text.split('\n');
  return (
    <div
      className={s.codeBlock}
      data-part="code-block"
      data-variant={variant}
      data-highlighting={highlighting}
    >
      <div className={s.codeHeader}>
        <span>{label}</span>
        <IconButton
          icon="copy"
          disabled={streaming || !text || code.length > 100000}
          onClick={() => void copy()}
          label={`Copy ${label} code`}
        />
      </div>
      <pre ref={pre} className={s.code} role="group" aria-label={`${label} code`} tabIndex={0}>
        <code>
          {lines || variant === 'numbered' || highlightLines || scrollToLine !== undefined
            ? sourceLines.map((line, index) => (
                <span
                  className={s.codeLine}
                  key={index}
                  data-line={index + 1}
                  data-highlighted={marked(index + 1)}
                >
                  {variant === 'numbered' && (
                    <span aria-hidden="true" className={s.lineNumber}>
                      {index + 1}
                    </span>
                  )}
                  {lines?.[index] ? <CodeTokenLine tokens={lines[index]} /> : line}
                  {index < sourceLines.length - 1 ? '\n' : ''}
                </span>
              ))
            : text}
        </code>
      </pre>
      {code.length > 100000 && (
        <p className={s.codeFeedback}>Code preview truncated at 100,000 characters.</p>
      )}
      {notice && (
        <p className={s.codeFeedback} data-part="highlight-notice">
          {notice}
        </p>
      )}
      <span role="status" className={s.codeFeedback}>
        {streaming
          ? 'Receiving code…'
          : feedback?.code === code && feedback.language === language
            ? feedback.message
            : ''}
      </span>
    </div>
  );
});
export const MarkdownCodeBlock = forwardRef<CodeBlockHandle, MarkdownCodeBlockProps>(
  function MarkdownCodeBlock(props, ref) {
    return <CodeBlockView {...props} ref={ref} />;
  },
);
