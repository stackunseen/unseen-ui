'use client';
import { Component, createContext, createElement, memo, useContext, useId, useMemo } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components, ExtraProps, Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remend from 'remend';
import { safeUrl } from '@stackunseen/ui-core';
import type { Source } from '@stackunseen/ui-core';
import { Citation } from '../citation/citation.js';
import { StreamingResponse } from '../streaming-response/streaming-response.js';
import type { StreamingResponseProps } from '../streaming-response/streaming-response.js';
import type { MessageContentProps } from '../message-content/message-content.js';
import { MarkdownCodeBlock } from '../code-block/code-block.js';
import type { MarkdownCodeBlockProps } from '../code-block/code-block.js';
export { MarkdownCodeBlock } from '../code-block/code-block.js';
export type { MarkdownCodeBlockProps } from '../code-block/code-block.js';
import s from './markdown-response.module.css';

export interface MarkdownResponseProps extends Omit<StreamingResponseProps, 'renderContent'> {
  /** HTML level for a source # heading. Deeper headings are capped at level six. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Trusted application renderer for fenced code; Markdown cannot supply executable UI. */
  renderCodeBlock?: (props: MarkdownCodeBlockProps) => ReactNode;
  /**
   * Sources the text cites as [1], [2] and so on, in that order. Each marker becomes a citation
   * that opens its source. Markers without a source, and anything inside code, stay as text.
   */
  citations?: readonly Source[];
}
const maxCharacters = 100_000;
const StreamingContext = createContext(false);
const CodeContext = createContext<MarkdownResponseProps['renderCodeBlock']>(undefined);
export function useMarkdownStreaming() {
  return useContext(StreamingContext);
}
export interface MarkdownExtensions {
  remarkPlugins?: Options['remarkPlugins'];
  components?: Components;
}
const TaskContext = createContext('Task');
const CitationContext = createContext<readonly Source[] | undefined>(undefined);

type MdNode = { type: string; value?: string; children?: MdNode[]; data?: Record<string, unknown> };
const citationMarker = /\[(\d{1,3})\]/g;
// Code, links and definitions keep their brackets.
const skipped = new Set(['code', 'inlineCode', 'link', 'linkReference', 'definition', 'html']);

/** Turns [n] in plain text into a marked superscript that the sup renderer resolves. */
function remarkCitations() {
  return (tree: MdNode) => {
    const walk = (node: MdNode) => {
      if (!node.children || skipped.has(node.type)) return;
      const next: MdNode[] = [];
      for (const child of node.children) {
        if (child.type !== 'text' || !child.value?.includes('[')) {
          walk(child);
          next.push(child);
          continue;
        }
        let last = 0;
        for (const match of child.value.matchAll(citationMarker)) {
          const at = match.index ?? 0;
          if (at > last) next.push({ type: 'text', value: child.value.slice(last, at) });
          next.push({
            type: 'citationMarker',
            data: { hName: 'sup', hProperties: { dataCitation: match[1] } },
            children: [{ type: 'text', value: match[0] }],
          });
          last = at + match[0].length;
        }
        if (last < child.value.length) next.push({ type: 'text', value: child.value.slice(last) });
      }
      node.children = next;
    };
    walk(tree);
  };
}

function Superscript({ children, node: _node, ...props }: ComponentProps<'sup'> & ExtraProps) {
  const citations = useContext(CitationContext);
  const marker = (props as Record<string, unknown>)['data-citation'];
  if (typeof marker !== 'string') return <sup {...props}>{children}</sup>;
  const number = Number(marker);
  const source = citations?.[number - 1];
  // A number with no source reads as the text the model wrote.
  return source ? <Citation source={source} number={number} variant="number" /> : <>[{marker}]</>;
}
const plugins = [remarkGfm];
const elements = [
  'p',
  'a',
  'img',
  'em',
  'strong',
  'del',
  'blockquote',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'hr',
  'br',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'input',
  'section',
  'sup',
];

function linkUrl(value?: unknown) {
  if (typeof value !== 'string') return;
  return value && /^https?:\/\//i.test(value) && !/[\s\\]/.test(value) ? safeUrl(value) : undefined;
}
type MarkdownNode = NonNullable<ExtraProps['node']>['children'][number];
function nodeText(node: MarkdownNode): string {
  return node.type === 'text'
    ? node.value
    : node.type === 'element'
      ? node.children.map(nodeText).join('')
      : '';
}
function TaskCheckbox({ checked }: { checked?: boolean }) {
  const label = useContext(TaskContext);
  return <input type="checkbox" checked={checked} readOnly disabled aria-label={label} />;
}

export function ParsedCodeBlock({ node }: { children?: ReactNode } & ExtraProps) {
  const streaming = useContext(StreamingContext);
  const renderCode = useContext(CodeContext);
  const code = node?.children.find((child) => child.type === 'element' && child.tagName === 'code');
  const text =
    code?.type === 'element'
      ? code.children
          .map((child) => (child.type === 'text' ? child.value : ''))
          .join('')
          .replace(/\n$/, '')
      : '';
  const classes = code?.type === 'element' ? code.properties.className : undefined;
  const language = Array.isArray(classes)
    ? String(classes.find((value) => String(value).startsWith('language-')) ?? '').slice(9, 49)
    : '';
  const props = { code: text, language, streaming };
  return renderCode ? renderCode(props) : <MarkdownCodeBlock {...props} />;
}

class RenderBoundary extends Component<{ text: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidUpdate(previous: { text: string }) {
    if (this.state.failed && previous.text !== this.props.text) this.setState({ failed: false });
  }
  render() {
    return this.state.failed ? (
      <div>
        <p role="status">Formatting unavailable. Showing response text.</p>
        <pre className={s.fallback} tabIndex={0} role="group" aria-label="Response text">
          {this.props.text.slice(0, maxCharacters)}
        </pre>
      </div>
    ) : (
      this.props.children
    );
  }
}

const MarkdownContent = memo(function MarkdownContent({
  text,
  state,
  headingLevel,
  extensions,
  renderCodeBlock,
  citations,
}: { extensions?: MarkdownExtensions } & Pick<
  MarkdownResponseProps,
  'text' | 'state' | 'headingLevel' | 'renderCodeBlock' | 'citations'
>) {
  const id = useId();
  const prefix = `ai-md-${id.replace(/[^a-zA-Z0-9_-]/g, '')}-`;
  const level = headingLevel ?? 3;
  const components = useMemo<Components>(
    () => ({
      pre: ParsedCodeBlock,
      input: TaskCheckbox,
      li: ({ node, children, className, id }) => {
        const label =
          node?.children
            .filter((child) => !(child.type === 'element' && ['ul', 'ol'].includes(child.tagName)))
            .map(nodeText)
            .join(' ')
            .trim()
            .slice(0, 1000) || 'Task';
        return (
          <li className={className} id={id}>
            <TaskContext.Provider value={label}>{children}</TaskContext.Provider>
          </li>
        );
      },
      a: ({ href, children, id, title, 'aria-label': label, 'aria-describedby': describedBy }) => {
        const fragment = href?.startsWith(`#${prefix}`) ? href : undefined;
        const url = fragment ?? linkUrl(href);
        return url ? (
          <a
            href={url}
            id={id}
            title={title}
            aria-label={label}
            aria-describedby={
              describedBy === 'footnote-label' ? `${prefix}footnote-label` : describedBy
            }
            target={fragment ? undefined : '_blank'}
            rel={fragment ? undefined : 'noopener noreferrer'}
          >
            {children}
            {!fragment && <span className={s.srOnly}> (opens in a new tab)</span>}
          </a>
        ) : (
          <span data-part="unavailable-link">{children}</span>
        );
      },
      img: ({ alt, src }) => (
        <span className={s.imageNote}>
          Image: {alt || 'Untitled image'}
          {linkUrl(src) && (
            <>
              {' '}
              ·{' '}
              <a href={linkUrl(src)} target="_blank" rel="noopener noreferrer">
                Open image<span className={s.srOnly}> (opens in a new tab)</span>
              </a>
            </>
          )}
        </span>
      ),
      sup: Superscript,
      table: ({ children }) => (
        <div className={s.tableScroll} role="group" aria-label="Response table" tabIndex={0}>
          <table>{children}</table>
        </div>
      ),
      th: ({ children, style }) => (
        <th scope="col" style={style}>
          {children}
        </th>
      ),
      ...extensions?.components,
      ...Object.fromEntries(
        [1, 2, 3, 4, 5, 6].map((sourceLevel) => [
          `h${sourceLevel}`,
          ({ children, id }: { children?: ReactNode; id?: string }) =>
            createElement(
              `h${Math.min(6, level + sourceLevel - 1)}`,
              {
                id: id === 'footnote-label' ? `${prefix}footnote-label` : id,
                'data-source-level': sourceLevel,
              },
              children,
            ),
        ]),
      ),
    }),
    [level, prefix, extensions],
  );
  const content = useMemo(
    () =>
      text.length > maxCharacters
        ? ''
        : state === 'streaming'
          ? remend(text, { katex: false, inlineKatex: false, htmlTags: false })
          : text,
    [text, state],
  );
  if (text.length > maxCharacters)
    return (
      <div className={s.markdown}>
        <p role="status">
          Response exceeds the formatting limit. Showing the first 100,000 characters as text.
        </p>
        <pre className={s.fallback} tabIndex={0} role="group" aria-label="Response text">
          {text.slice(0, maxCharacters)}
        </pre>
      </div>
    );
  return (
    <div className={s.markdown} data-part="markdown">
      <StreamingContext.Provider value={state === 'streaming'}>
        <CodeContext.Provider value={renderCodeBlock}>
          <CitationContext.Provider value={citations}>
            <ReactMarkdown
              remarkPlugins={[
                ...plugins,
                ...(citations?.length ? [remarkCitations] : []),
                ...(extensions?.remarkPlugins ?? []),
              ]}
              remarkRehypeOptions={{ clobberPrefix: prefix }}
              components={components}
              allowedElements={elements}
              urlTransform={(url, key) =>
                key === 'href' && url.startsWith(`#${prefix}`) ? url : (linkUrl(url) ?? '')
              }
            >
              {content}
            </ReactMarkdown>
          </CitationContext.Provider>
        </CodeContext.Provider>
      </StreamingContext.Provider>
    </div>
  );
});

/** Optional rich rendering; importing the base library never imports a Markdown parser. */
export function MarkdownResponse({
  headingLevel = 3,
  extensions,
  renderCodeBlock,
  citations,
  ...props
}: MarkdownResponseProps & { extensions?: MarkdownExtensions }) {
  return (
    <StreamingResponse
      {...props}
      renderContent={({ text, state }) => (
        <RenderBoundary text={text}>
          <MarkdownContent
            text={text}
            state={state}
            headingLevel={headingLevel}
            extensions={extensions}
            renderCodeBlock={renderCodeBlock}
            citations={citations}
          />
        </RenderBoundary>
      )}
    />
  );
}
/** Stable renderer for Message.renderTextPart; each text part is an independent document. */
export const renderMarkdownPart: NonNullable<MessageContentProps['renderTextPart']> = (
  part,
  variant,
) =>
  part.format === 'markdown' ? (
    <MarkdownResponse text={part.text} state={part.state} variant={variant} showStatus={false} />
  ) : (
    <StreamingResponse text={part.text} state={part.state} variant={variant} showStatus={false} />
  );
