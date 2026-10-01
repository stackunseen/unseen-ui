'use client';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual';
import type { Range } from '@tanstack/react-virtual';
import { conversationContextKey, sameConversationContext } from '@ai-interaction/core';
import type { MessageData, NavigationAvailability } from '@ai-interaction/core';
import {
  historyLimits,
  historyScopeKey,
  inspectConversationHistory,
  inspectHistoryRestore,
} from '@ai-interaction/core/history';
import type {
  ConversationHistory,
  HistoryEdge,
  HistoryPageRequest,
  HistoryPosition,
  HistoryRestore,
  HistoryRestoreResult,
} from '@ai-interaction/core/history';
import { Message } from '../message/message.js';
import type { MessageProps } from '../message/message.js';
import { Button } from '../button/button.js';
import { AIIcon } from '../../providers/icons/icons.js';
import s from './conversation-viewport.module.css';

export type ConversationViewportVariant = 'thread' | 'bubble' | 'compact';
export interface ConversationViewportProps {
  value: ConversationHistory;
  availability?: NavigationAvailability;
  variant?: ConversationViewportVariant;
  /** All rows in the DOM, bounded to 200. The host supplies smaller windows when needed. */
  mode?: 'virtual' | 'reading';
  label?: string;
  className?: string;
  style?: CSSProperties;
  empty?: ReactNode;
  onRequestPage?: (request: HistoryPageRequest) => void;
  onPositionChange?: (position: HistoryPosition) => void;
  restore?: HistoryRestore;
  onRestoreResult?: (result: HistoryRestoreResult) => void;
  /** Host-owned rendering, authorization and action slots use the canonical Message contract. */
  messageProps?: Pick<
    MessageProps,
    'sources' | 'tools' | 'attachments' | 'renderContent' | 'renderTextPart' | 'responseVariant'
  >;
  renderActions?: (message: MessageData) => ReactNode;
}
const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const Row = memo(function Row({
  message,
  variant,
  messageProps,
  renderActions,
}: {
  message: MessageData;
  variant: ConversationViewportVariant;
  messageProps?: ConversationViewportProps['messageProps'];
  renderActions?: ConversationViewportProps['renderActions'];
}) {
  return (
    <Message {...messageProps} value={message} variant={variant === 'bubble' ? 'bubble' : 'plain'}>
      {renderActions?.(message)}
    </Message>
  );
});
function Edge({
  edge,
  direction,
  locked,
  request,
}: {
  edge: HistoryEdge;
  direction: 'older' | 'newer';
  locked: boolean;
  request?: () => void;
}) {
  const name = direction === 'older' ? 'earlier' : 'newer';
  if (edge.state === 'end') return null;
  return (
    <div className={s.edge} data-edge={direction}>
      <span>
        {edge.state === 'loading'
          ? `Loading ${name} messages…`
          : edge.state === 'error'
            ? edge.detail || `Could not load ${name} messages.`
            : edge.state === 'unknown'
              ? `${direction === 'older' ? 'Earlier' : 'Newer'} history availability is unknown.`
              : `${direction === 'older' ? 'Earlier' : 'Newer'} messages are available.`}
      </span>
      {['available', 'error'].includes(edge.state) && request && (
        <Button size="sm" variant="ghost" disabled={locked} onClick={request}>
          <AIIcon
            name={edge.state === 'error' ? 'retry' : direction === 'older' ? 'collapse' : 'expand'}
          />
          {edge.state === 'error' ? `Retry ${name} messages` : `Load ${name} messages`}
        </Button>
      )}
    </div>
  );
}
function Reader({
  history,
  availability,
  mode,
  variant,
  label,
  empty,
  onRequestPage,
  onPositionChange,
  restore,
  onRestoreResult,
  messageProps,
  renderActions,
}: Omit<ConversationViewportProps, 'value' | 'style' | 'className'> & {
  history: ConversationHistory;
  availability: NavigationAvailability;
  mode: 'virtual' | 'reading';
  variant: ConversationViewportVariant;
  label: string;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(true),
    [focusedId, setFocusedId] = useState<string>();
  const [selectionIds, setSelectionIds] = useState<readonly string[]>([]);
  const current = useRef({ history, availability, onPositionChange, onRestoreResult });
  current.current = { history, availability, onPositionChange, onRestoreResult };
  const indexById = useMemo(
    () => new Map(history.messages.map((m, i) => [m.id, i])),
    [history.messages],
  );
  const focusedIndex = focusedId ? indexById.get(focusedId) : undefined;
  const getItemKey = useCallback(
    (index: number) => history.messages[index]!.id,
    [history.messages],
  );
  const rangeExtractor = useCallback(
    (range: Range) => {
      const indices = defaultRangeExtractor(range);
      if (focusedIndex !== undefined && !indices.includes(focusedIndex)) indices.push(focusedIndex);
      const selected = selectionIds
        .map((id) => indexById.get(id))
        .filter((index): index is number => index !== undefined);
      if (selected.length) {
        const first = Math.min(...selected),
          last = Math.max(...selected);
        // Selection across a larger range needs the host's full-reading window.
        if (last - first < historyLimits.readingMessages) {
          for (let i = first; i <= last; i++) if (!indices.includes(i)) indices.push(i);
        } else {
          for (const i of selected) if (!indices.includes(i)) indices.push(i);
        }
      }
      return indices.sort((a, b) => a - b);
    },
    [focusedIndex, selectionIds, indexById],
  );
  const virtualizer = useVirtualizer<HTMLDivElement, HTMLLIElement>({
    count: history.messages.length,
    getScrollElement: () => scroll.current,
    getItemKey,
    estimateSize: () => (variant === 'compact' ? 100 : 160),
    overscan: 4,
    anchorTo: 'end',
    followOnAppend: history.newer.state === 'end' ? 'auto' : false,
    scrollEndThreshold: 48,
    rangeExtractor,
    enabled: mode === 'virtual',
    useFlushSync: false,
  });
  const follow = useRef(true),
    scrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handled = useRef(new Set<string>());
  const last = history.messages.at(-1);
  const lastIdentity = last ? `${last.id}:${last.revision}` : '';
  const [seen, setSeen] = useState(lastIdentity);
  const latest = history.newer.state === 'end';
  const contextIdentity = conversationContextKey(history.context);
  const locked =
    availability !== 'ready' ||
    history.older.state === 'loading' ||
    history.newer.state === 'loading';
  const toEnd = useCallback(() => {
    follow.current = true;
    if (mode === 'virtual') virtualizer.scrollToEnd();
    else if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
    setAtEnd(true);
  }, [mode, virtualizer]);
  useClientLayoutEffect(() => {
    const request = inspectHistoryRestore(restore);
    if (
      request &&
      sameConversationContext(request.context, history.context) &&
      indexById.has(request.messageId)
    )
      return;
    const frame = requestAnimationFrame(toEnd);
    return () => cancelAnimationFrame(frame);
    // Initial position belongs to this scoped reader; subsequent revisions use anchoring.
  }, []);
  useEffect(() => {
    const onSelection = () => {
      const selection = scroll.current?.ownerDocument.getSelection();
      const ids =
        selection && !selection.isCollapsed
          ? [selection.anchorNode, selection.focusNode].flatMap((node) => {
              const row = (
                node?.nodeType === 1 ? (node as Element) : node?.parentElement
              )?.closest<HTMLElement>('[data-message-id]');
              return row && scroll.current?.contains(row) ? [row.dataset.messageId!] : [];
            })
          : [];
      setSelectionIds((prior) => (prior.join('\0') === ids.join('\0') ? prior : ids));
    };
    const document = scroll.current?.ownerDocument;
    document?.addEventListener('selectionchange', onSelection);
    return () => document?.removeEventListener('selectionchange', onSelection);
  }, []);
  useClientLayoutEffect(() => {
    if (mode === 'reading' && follow.current) toEnd();
  }, [history.messages, mode, toEnd]);
  useClientLayoutEffect(() => {
    if (focusedId && focusedIndex === undefined) {
      scroll.current?.focus({ preventScroll: true });
      setFocusedId(undefined);
    }
  }, [focusedId, focusedIndex]);
  useEffect(
    () => () => {
      clearTimeout(scrollTimer.current);
    },
    [],
  );
  useClientLayoutEffect(() => {
    const request = inspectHistoryRestore(restore);
    if (!request) return;
    const key = JSON.stringify([request.requestId, conversationContextKey(request.context)]);
    if (handled.current.has(key)) return;
    const report = (outcome: HistoryRestoreResult['outcome']) => {
      handled.current.add(key);
      if (handled.current.size > 128)
        handled.current.delete(handled.current.values().next().value!);
      current.current.onRestoreResult?.({
        requestId: request.requestId,
        context: request.context,
        outcome,
      });
    };
    if (!sameConversationContext(request.context, history.context)) {
      report('obsolete');
      return;
    }
    const index = indexById.get(request.messageId);
    if (index === undefined) {
      report('missing');
      return;
    }
    follow.current = false;
    if (mode === 'virtual') virtualizer.scrollToIndex(index, { align: 'start' });
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        if (
          !sameConversationContext(request.context, current.current.history.context) ||
          !['ready', 'stale'].includes(current.current.availability)
        ) {
          report('obsolete');
          return;
        }
        const node = [
          ...(scroll.current?.querySelectorAll<HTMLElement>('[data-message-id]') || []),
        ].find((n) => n.dataset.messageId === request.messageId);
        if (!node || !scroll.current) {
          report('missing');
          return;
        }
        const top = node.getBoundingClientRect().top - scroll.current.getBoundingClientRect().top;
        scroll.current.scrollTop +=
          top + Math.min(request.inset, Math.max(0, node.getBoundingClientRect().height - 1));
        report('applied');
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
    // Callback identity changes must not replay a consumed restoration.
  }, [restore, contextIdentity, mode]);
  function onScroll() {
    const node = scroll.current;
    if (!node) return;
    const end = node.scrollHeight - node.scrollTop - node.clientHeight <= 48;
    follow.current = end;
    setAtEnd(end);
    if (end) setSeen(lastIdentity);
    clearTimeout(scrollTimer.current);
    const context = history.context;
    scrollTimer.current = setTimeout(() => {
      if (
        !sameConversationContext(context, current.current.history.context) ||
        !['ready', 'stale'].includes(current.current.availability)
      )
        return;
      const bounds = node.getBoundingClientRect();
      const row = [...node.querySelectorAll<HTMLElement>('[data-message-id]')].find(
        (item) =>
          item.getBoundingClientRect().bottom > bounds.top + 1 &&
          item.getBoundingClientRect().top < bounds.bottom,
      );
      if (row)
        current.current.onPositionChange?.({
          context,
          messageId: row.dataset.messageId!,
          inset: Math.max(0, bounds.top - row.getBoundingClientRect().top),
        });
    }, 150);
  }
  const rows =
    mode === 'virtual'
      ? virtualizer.getVirtualItems().map((v) => ({ index: v.index, start: v.start, key: v.key }))
      : history.messages.map((m, index) => ({ index, start: 0, key: m.id }));
  const requestPage = (direction: 'older' | 'newer') => {
    const edge = current.current.history[direction];
    if (!locked && edge.cursor && ['available', 'error'].includes(edge.state))
      onRequestPage?.({ context: current.current.history.context, direction, cursor: edge.cursor });
  };
  return (
    <>
      {availability === 'stale' && (
        <p className={s.notice}>
          Showing saved messages. History requests are unavailable until the host reconnects.
        </p>
      )}
      <Edge
        edge={history.older}
        direction="older"
        locked={locked}
        request={onRequestPage ? () => requestPage('older') : undefined}
      />
      <div
        ref={scroll}
        className={s.scroll}
        role="group"
        aria-label={`${label} reading area`}
        tabIndex={0}
        data-mode={mode}
        onScroll={onScroll}
        onFocusCapture={(event) => {
          const row = (event.target as HTMLElement).closest<HTMLElement>('[data-message-id]');
          setFocusedId(row?.dataset.messageId);
        }}
        onBlurCapture={(event) => {
          if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node))
            setFocusedId(undefined);
        }}
      >
        {!history.messages.length ? (
          <div className={s.empty}>{empty || 'No messages in this window.'}</div>
        ) : (
          <ol
            className={s.list}
            aria-label="Messages"
            style={
              mode === 'virtual'
                ? { height: virtualizer.getTotalSize(), position: 'relative' }
                : undefined
            }
          >
            {rows.map(({ index, start, key }) => {
              const message = history.messages[index]!;
              return (
                <li
                  key={key}
                  data-index={index}
                  data-message-id={message.id}
                  ref={mode === 'virtual' ? virtualizer.measureElement : undefined}
                  className={s.item}
                  style={
                    mode === 'virtual'
                      ? {
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${start}px)`,
                        }
                      : undefined
                  }
                  aria-posinset={
                    history.startIndex !== undefined ? history.startIndex + index + 1 : undefined
                  }
                  aria-setsize={history.totalMessages ?? -1}
                >
                  <Row
                    message={message}
                    variant={variant}
                    messageProps={messageProps}
                    renderActions={renderActions}
                  />
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <Edge
        edge={history.newer}
        direction="newer"
        locked={locked}
        request={onRequestPage ? () => requestPage('newer') : undefined}
      />
      <div className={s.footer}>
        <span className={s.quiet} role="status">
          {!atEnd && seen !== lastIdentity
            ? 'New output available'
            : mode === 'reading'
              ? 'Full reading window'
              : 'Windowed message rendering'}
        </span>
        {!atEnd && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              toEnd();
              setSeen(lastIdentity);
            }}
          >
            <AIIcon name="expand" />
            {latest ? 'Jump to latest' : 'Jump to end of window'}
          </Button>
        )}
      </div>
    </>
  );
}
/** Optional measured viewport. Never loads data, executes actions or changes host state. */
export function ConversationViewport({
  value,
  availability = 'ready',
  variant = 'thread',
  mode = 'virtual',
  label = 'Conversation',
  className = '',
  style,
  ...props
}: ConversationViewportProps) {
  const root = useRef<HTMLElement>(null),
    ownedFocus = useRef(false);
  const visible = ['ready', 'stale'].includes(availability);
  const history = visible ? inspectConversationHistory(value) : undefined;
  const valid =
    !!history && (mode !== 'reading' || history.messages.length <= historyLimits.readingMessages);
  const scope = history ? historyScopeKey(history.context) : 'hidden';
  const priorScope = useRef(scope);
  useClientLayoutEffect(() => {
    if (priorScope.current !== scope && ownedFocus.current)
      root.current?.focus({ preventScroll: true });
    priorScope.current = scope;
  }, [scope]);
  const problem =
    availability === 'loading'
      ? 'Loading conversation history…'
      : availability === 'denied'
        ? 'Conversation access denied.'
        : availability === 'unknown'
          ? 'Conversation access is unknown.'
          : availability === 'unavailable'
            ? 'Conversation history is unavailable.'
            : availability === 'error'
              ? 'Conversation history could not be loaded.'
              : !history
                ? 'Conversation history is invalid or exceeds its limits.'
                : 'Full reading mode requires a host window of at most 200 messages.';
  return (
    <section
      ref={root}
      role="region"
      aria-label={label}
      tabIndex={-1}
      className={`${s.root} ${className}`}
      style={style}
      data-variant={variant}
      data-availability={availability}
      onFocusCapture={() => {
        ownedFocus.current = true;
      }}
      onBlurCapture={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node))
          ownedFocus.current = false;
      }}
    >
      {valid ? (
        <Reader
          key={`${scope}:${mode}`}
          {...props}
          history={history!}
          availability={availability}
          mode={mode}
          variant={variant}
          label={label}
        />
      ) : (
        <p className={s.notice} role="status">
          {problem}
        </p>
      )}
    </section>
  );
}
