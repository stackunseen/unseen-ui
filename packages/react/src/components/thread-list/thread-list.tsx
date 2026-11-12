'use client';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  sameConversationContext,
  inspectThreadWindow,
  inspectConversationPagination,
  inspectConversationScroll,
} from '@stackunseen/ui-core/conversation';
import type {
  ConversationPagination,
  ConversationScroll,
  ThreadSummary,
  ThreadSelectionRequest,
  ThreadRenameRequest,
  ConversationPageRequest,
  ConversationSearchRequest,
} from '@stackunseen/ui-core';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Button } from '../button/button.js';
import { IconButton } from '../icon-button/icon-button.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/agent-controls.module.css';
import n from '../../shared/styles/navigation.module.css';
import actions from '../../shared/styles/action-layout.module.css';
import { Input } from '../input/input.js';
import type { NavigationStateProps } from '../../shared/conversation-navigation/conversation-navigation.js';
import {
  navigationState,
  useNavigationFocus,
  Notice,
  Pagination,
} from '../../shared/conversation-navigation/conversation-navigation.js';

export interface ThreadListProps extends VariantProps<'ThreadList'>, NavigationStateProps {
  /** Complete bounded host window, at most 100 unique rows. Invalid/excessive data is rejected. */
  threads: readonly ThreadSummary[];
  label?: string;
  selectedId?: string;
  query: string;
  onQueryChange?: (value: string) => void;
  onSelect?: (thread: ThreadSummary) => void;
  onRename?: (thread: ThreadSummary, title: string) => void;
  onArchive?: (thread: ThreadSummary) => void;
  onRequestSelect?: (request: ThreadSelectionRequest) => void;
  onRequestRename?: (request: ThreadRenameRequest) => void;
  onRequestArchive?: (request: ThreadSelectionRequest) => void;
  onRequestSearch?: (request: ConversationSearchRequest) => void;
  pagination?: ConversationPagination;
  onPageChange?: (pageIndex: number) => void;
  onRequestPage?: (request: ConversationPageRequest) => void;
  onLoadMore?: () => void;
  loading?: boolean;
  error?: string;
  scrollOffset?: number;
  onScrollOffsetChange?: (offset: number) => void;
  scrollRestoration?: ConversationScroll;
  onScrollSnapshotChange?: (snapshot: ConversationScroll) => void;
  /** Controls beside the list title, such as a New chat button. */
  actions?: ReactNode;
  /**
   * "date" groups threads into Pinned, Today, Yesterday, Previous 7 days, Previous 30 days and
   * Earlier, from each thread's updatedAt. Order inside a group stays as the host sent it.
   */
  groupBy?: 'none' | 'date';
  /** The host clock for date groups (ISO 8601), so server and browser agree. */
  now?: string;
  /**
   * false leaves out the search box, for a sidebar that searches somewhere else, such as a
   * "Search chats" dialog. The host still filters the threads it passes by `query`.
   */
  searchable?: boolean;
  /** Extra per-thread controls, such as a menu with Share or Move, after Rename and Archive. */
  rowActions?: (thread: ThreadSummary) => ReactNode;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}

export type ThreadDateGroup =
  'Pinned' | 'Today' | 'Yesterday' | 'Previous 7 days' | 'Previous 30 days' | 'Earlier';

const dateGroups: readonly ThreadDateGroup[] = [
  'Pinned',
  'Today',
  'Yesterday',
  'Previous 7 days',
  'Previous 30 days',
  'Earlier',
];

/** Splits threads into date groups by local calendar day, keeping the host's order in each. */
export function groupThreadsByDate(
  threads: readonly ThreadSummary[],
  now: Date | string | number = Date.now(),
): { group: ThreadDateGroup; threads: ThreadSummary[] }[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const day = 24 * 3600_000;
  const startOfToday = today.getTime();
  const pick = (thread: ThreadSummary): ThreadDateGroup => {
    if (thread.pinned) return 'Pinned';
    const at = thread.updatedAt ? Date.parse(thread.updatedAt) : Number.NaN;
    if (!Number.isFinite(at)) return 'Earlier';
    if (at >= startOfToday) return 'Today';
    if (at >= startOfToday - day) return 'Yesterday';
    if (at >= startOfToday - 7 * day) return 'Previous 7 days';
    if (at >= startOfToday - 30 * day) return 'Previous 30 days';
    return 'Earlier';
  };
  const buckets = new Map<ThreadDateGroup, ThreadSummary[]>();
  for (const thread of threads) {
    const group = pick(thread);
    buckets.set(group, [...(buckets.get(group) ?? []), thread]);
  }
  return dateGroups
    .filter((group) => buckets.has(group))
    .map((group) => ({ group, threads: buckets.get(group)! }));
}

export function ThreadList(props: ThreadListProps) {
  const {
    threads,
    selectedId,
    query,
    onQueryChange,
    onSelect,
    onRename,
    onArchive,
    onRequestSelect,
    onRequestRename,
    onRequestArchive,
    onRequestSearch,
    searchable = true,
    pagination,
    onPageChange,
    onRequestPage,
    onLoadMore,
    error,
    scrollOffset,
    onScrollOffsetChange,
    scrollRestoration,
    onScrollSnapshotChange,
    variant = 'list',
    label = 'Conversations',
    actions: headerActions,
    groupBy = 'none',
    now,
    rowActions,
  } = props;
  const groupId = useId();
  const visible =
    (props.status ?? (props.loading ? 'loading' : 'ready')) === 'ready' || props.status === 'stale';
  const rows = visible ? inspectThreadWindow(threads) : undefined;
  const page =
    visible && pagination
      ? inspectConversationPagination(pagination, rows?.length ?? 0)
      : undefined;
  const queryValid = typeof query === 'string' && query.length <= 200;
  const state = navigationState(
    { ...props, status: props.status ?? (props.loading ? 'loading' : 'ready') },
    !!rows && queryValid && (!pagination || !!page),
  );
  const { root, events } = useNavigationFocus(),
    list = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null),
    origin = useRef<HTMLElement | null>(null);
  const [editing, setEditing] = useState<{ thread: ThreadSummary; title: string; key: string }>();
  const scope = state.context;
  const restoration =
    state.visible && state.valid ? inspectConversationScroll(scrollRestoration) : undefined;
  const currentScroll =
    restoration &&
    scope &&
    sameConversationContext(scope, restoration.context) &&
    restoration.query === query
      ? restoration
      : undefined;
  const restoreOffset = currentScroll?.offset;
  useLayoutEffect(() => {
    if (!list.current || !state.visible || !state.valid) return;
    if (restoreOffset !== undefined) list.current.scrollTop = restoreOffset;
    else if (
      props.context === undefined &&
      scrollRestoration === undefined &&
      typeof scrollOffset === 'number' &&
      Number.isFinite(scrollOffset) &&
      scrollOffset >= 0
    )
      list.current.scrollTop = scrollOffset;
  }, [
    restoreOffset,
    state.key,
    state.status,
    variant,
    scrollOffset,
    rows?.length,
    props.context,
    scrollRestoration,
    state.visible,
    state.valid,
  ]);
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, [editing?.thread.id, editing?.key]);
  function close() {
    setEditing(undefined);
    if (origin.current?.isConnected) origin.current.focus();
    else root.current?.focus();
  }
  const canSelect = onRequestSelect ? !!scope : !!onSelect,
    canRename = onRequestRename ? !!scope : !!onRename,
    canArchive = onRequestArchive ? !!scope : !!onArchive;
  const request = (row: ThreadSummary): ThreadSelectionRequest => ({
    context: { ...scope! },
    threadId: row.id,
    threadVersion: row.version,
  });
  const currentEdit = editing?.key === state.key ? editing : undefined;
  const renderRow = (row: ThreadSummary) => (
    <li
      key={row.id}
      className={n.thread}
      data-selected={row.id === selectedId}
      data-pending={!!row.pending}
    >
      <button
        className={n.threadSelect}
        type="button"
        aria-current={row.id === selectedId ? 'true' : undefined}
        disabled={state.locked || row.pending || !canSelect}
        onClick={() => {
          if (onRequestSelect && scope) onRequestSelect(request(row));
          else if (!onRequestSelect) onSelect?.(row);
        }}
      >
        <span>
          <strong>{row.title}</strong>
          {row.detail && <small className={s.muted}>{row.detail}</small>}
          {row.pending && <small className={s.muted}>Awaiting confirmation</small>}
        </span>
      </button>
      {(onRequestRename || onRename || onRequestArchive || onArchive || rowActions) && (
        <div className={n.actions} role="group" aria-label={`Actions for ${row.title}`}>
          {(onRequestRename || onRename) && (
            <IconButton
              icon="edit"
              label={`Rename ${row.title}`}
              disabled={state.locked || row.pending || !canRename}
              onClick={(e) => {
                origin.current = e.currentTarget;
                setEditing({ thread: row, title: row.title, key: state.key });
              }}
            />
          )}
          {(onRequestArchive || onArchive) && (
            <IconButton
              icon="archive"
              label={`Archive ${row.title}`}
              disabled={state.locked || row.pending || !canArchive}
              onClick={() => {
                if (onRequestArchive && scope) onRequestArchive(request(row));
                else if (!onRequestArchive) onArchive?.(row);
              }}
            />
          )}
          {rowActions?.(row)}
        </div>
      )}
      {currentEdit?.thread.id === row.id && (
        <form
          className={n.editor}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              close();
            }
          }}
          onSubmit={(e) => {
            e.preventDefault();
            if (
              currentEdit.title.trim() &&
              row.version === currentEdit.thread.version &&
              !state.locked &&
              !row.pending &&
              canRename
            ) {
              if (onRequestRename && scope)
                onRequestRename({ ...request(row), title: currentEdit.title.trim() });
              else if (!onRequestRename) onRename?.(row, currentEdit.title.trim());
              close();
            }
          }}
        >
          <label>
            Conversation title
            <Input
              ref={input}
              className={s.search}
              value={currentEdit.title}
              maxLength={200}
              disabled={state.locked || row.pending}
              onChange={(e) => setEditing({ ...currentEdit, title: e.target.value })}
            />
          </label>
          {row.version !== currentEdit.thread.version && (
            <p role="status" className={s.warning}>
              Conversation changed. Cancel and reopen to rename the current version.
            </p>
          )}
          <div className={actions.footer}>
            <Button size="sm" variant="ghost" onClick={close}>
              Cancel rename
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={
                !currentEdit.title.trim() ||
                row.version !== currentEdit.thread.version ||
                state.locked ||
                row.pending ||
                !canRename
              }
            >
              Save title
            </Button>
          </div>
        </form>
      )}
    </li>
  );
  return (
    <div
      ref={root}
      {...events}
      tabIndex={-1}
      role="group"
      aria-label="Conversation navigation"
      className={`${s.root} ${n.root} ${props.className ?? ''}`}
      data-part="thread-list"
      data-variant={variant}
      data-status={state.status}
    >
      {headerActions ? (
        <div className={n.listHead}>
          <strong>{label}</strong>
          <div className={n.actions}>{headerActions}</div>
        </div>
      ) : (
        <strong>{label}</strong>
      )}
      <Notice state={state} onReconcile={props.onReconcile} />
      {state.visible && state.valid && (
        <>
          {searchable && (
            <div className={n.search}>
              <AIIcon name="search" fallbackIcon={MagnifyingGlassIcon} />
              <Input
                type="search"
                className={s.search}
                aria-label="Search conversations"
                placeholder="Search conversations…"
                value={query}
                maxLength={200}
                disabled={state.locked || (onRequestSearch ? !scope : !onQueryChange)}
                onChange={(e) => {
                  if (onRequestSearch && scope)
                    onRequestSearch({ context: { ...scope }, query: e.target.value });
                  else if (!onRequestSearch) onQueryChange?.(e.target.value);
                }}
              />
            </div>
          )}
          {error && (
            <p role="alert" className={s.error}>
              {typeof error === 'string'
                ? error.slice(0, 1000)
                : 'Conversation history could not be loaded.'}
            </p>
          )}
          <div
            ref={list}
            className={n.threadWindow}
            role="group"
            aria-label={`${label} window`}
            tabIndex={0}
            onScroll={(e) => {
              const offset = e.currentTarget.scrollTop;
              if (state.locked) return;
              if (onScrollSnapshotChange && scope)
                onScrollSnapshotChange({ context: { ...scope }, query, offset });
              else if (!onScrollSnapshotChange) onScrollOffsetChange?.(offset);
            }}
          >
            {groupBy === 'date' ? (
              groupThreadsByDate(rows!, now).map(({ group, threads: grouped }) => (
                <div key={group} role="group" aria-labelledby={`${groupId}-${group}`}>
                  <span id={`${groupId}-${group}`} className={n.groupLabel}>
                    {group}
                  </span>
                  <ul className={n.threads}>{grouped.map(renderRow)}</ul>
                </div>
              ))
            ) : (
              <ul className={n.threads}>{rows!.map(renderRow)}</ul>
            )}
          </div>
          {editing && (!currentEdit || !rows!.some((row) => row.id === editing.thread.id)) && (
            <div className={n.editor}>
              <p role="status" className={s.muted}>
                The conversation being renamed is outside the current window.
              </p>
              <Button size="sm" variant="ghost" onClick={close}>
                Cancel rename
              </Button>
            </div>
          )}
          {!rows!.length && <p className={s.muted}>No conversations found.</p>}
          {selectedId && rows!.length > 0 && !rows!.some((row) => row.id === selectedId) && (
            <p role="status" className={s.muted}>
              The selected conversation isn’t in the loaded list.
            </p>
          )}
          {scrollRestoration && !currentScroll && (
            <p role="status" className={s.muted}>
              Scroll position belongs to an invalid or obsolete conversation window.
            </p>
          )}
          {page && (
            <Pagination
              page={page}
              rows={rows!.length}
              locked={state.locked}
              onPage={
                onRequestPage && scope
                  ? (index) =>
                      onRequestPage({
                        context: { ...scope },
                        pageIndex: index,
                        pageSize: page.pageSize,
                        query,
                      })
                  : !onRequestPage
                    ? onPageChange
                    : undefined
              }
            />
          )}
          {!page && onLoadMore && (
            <Button
              size="sm"
              className={n.loadMore}
              variant="ghost"
              disabled={state.locked}
              onClick={onLoadMore}
            >
              Load more conversations
            </Button>
          )}
        </>
      )}
    </div>
  );
}
