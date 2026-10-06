'use client';
import { useEffect, useRef, useState } from 'react';
import {
  inspectQueueWindow,
  inspectConversationPagination,
} from '@stackunseen/ui-core/conversation';
import type {
  ConversationPagination,
  QueuedMessage,
  QueueItemRequest,
  QueueEditRequest,
  QueueMoveRequest,
  ConversationPageRequest,
} from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { IconButton } from '../icon-button/icon-button.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/agent-controls.module.css';
import n from '../../shared/styles/navigation.module.css';
import actions from '../../shared/styles/action-layout.module.css';
import { Textarea } from '../textarea/textarea.js';
import type { NavigationStateProps } from '../../shared/conversation-navigation/conversation-navigation.js';
import {
  navigationState,
  useNavigationFocus,
  Notice,
  Pagination,
} from '../../shared/conversation-navigation/conversation-navigation.js';

export interface MessageQueueProps extends VariantProps<'MessageQueue'>, NavigationStateProps {
  items: readonly QueuedMessage[];
  onEdit?: (item: QueuedMessage, text: string) => void;
  onCancel?: (item: QueuedMessage) => void;
  onMove?: (item: QueuedMessage, direction: 'up' | 'down') => void;
  onRetry?: (item: QueuedMessage) => void;
  onRequestEdit?: (request: QueueEditRequest) => void;
  onRequestCancel?: (request: QueueItemRequest) => void;
  onRequestMove?: (request: QueueMoveRequest) => void;
  onRequestRetry?: (request: QueueItemRequest) => void;
  pagination?: ConversationPagination;
  onPageChange?: (index: number) => void;
  onRequestPage?: (request: ConversationPageRequest) => void;
}

export function MessageQueue(props: MessageQueueProps) {
  const {
    items,
    onEdit,
    onCancel,
    onMove,
    onRetry,
    onRequestEdit,
    onRequestCancel,
    onRequestMove,
    onRequestRetry,
    pagination,
    onPageChange,
    onRequestPage,
    variant = 'list',
  } = props;
  const visible = (props.status ?? 'ready') === 'ready' || props.status === 'stale',
    rows = visible ? inspectQueueWindow(items) : undefined;
  const page =
    visible && pagination
      ? inspectConversationPagination(pagination, rows?.length ?? 0, 50)
      : undefined;
  const state = navigationState(props, !!rows && (!pagination || !!page)),
    scope = state.context;
  const { root, events } = useNavigationFocus(),
    input = useRef<HTMLTextAreaElement>(null),
    origin = useRef<HTMLElement | null>(null);
  const [edit, setEdit] = useState<{ item: QueuedMessage; text: string; key: string }>();
  useEffect(() => {
    input.current?.focus();
  }, [edit?.item.id, edit?.key]);
  function close() {
    setEdit(undefined);
    if (origin.current?.isConnected) origin.current.focus();
    else root.current?.focus();
  }
  const currentEdit = edit?.key === state.key ? edit : undefined;
  const canEdit = onRequestEdit ? !!scope : !!onEdit,
    canCancel = onRequestCancel ? !!scope : !!onCancel,
    canMove = onRequestMove ? !!scope : !!onMove,
    canRetry = onRequestRetry ? !!scope : !!onRetry;
  const request = (item: QueuedMessage): QueueItemRequest => ({
    context: { ...scope! },
    itemId: item.id,
    itemVersion: item.version,
  });
  const previousWindow = page && page.pageIndex > 0,
    nextWindow =
      page &&
      (page.totalItems === undefined
        ? page.hasNextPage === true
        : (page.pageIndex + 1) * page.pageSize < page.totalItems);
  return (
    <div
      ref={root}
      {...events}
      role="group"
      aria-label="Queued messages"
      tabIndex={-1}
      className={`${s.root} ${n.root}`}
      data-part="message-queue"
      data-variant={variant}
      data-status={state.status}
    >
      <strong>Queued messages{state.visible && state.valid ? ` · ${rows!.length}` : ''}</strong>
      <Notice state={state} onReconcile={props.onReconcile} />
      {state.visible && state.valid && (
        <>
          {!rows!.length ? (
            <p className={s.muted}>The queue is empty.</p>
          ) : (
            <ol className={n.queue} start={(page?.pageIndex ?? 0) * (page?.pageSize ?? 0) + 1}>
              {rows!.map((item, index) => {
                const position = (page?.pageIndex ?? 0) * (page?.pageSize ?? 0) + index + 1,
                  locked =
                    state.locked || item.pending || !['queued', 'failed'].includes(item.state);
                return (
                  <li
                    className={n.queueItem}
                    key={item.id}
                    data-state={item.state}
                    data-pending={!!item.pending}
                  >
                    <div className={n.queueHeader}>
                      <div className={n.queueContent}>
                        {currentEdit?.item.id === item.id ? (
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
                                currentEdit.text.trim() &&
                                item.version === currentEdit.item.version &&
                                !locked &&
                                canEdit
                              ) {
                                if (onRequestEdit && scope)
                                  onRequestEdit({ ...request(item), text: currentEdit.text });
                                else if (!onRequestEdit) onEdit?.(item, currentEdit.text);
                                close();
                              }
                            }}
                          >
                            <label>
                              Edit queued draft
                              <Textarea
                                ref={input}
                                className={s.search}
                                value={currentEdit.text}
                                maxLength={20000}
                                rows={3}
                                disabled={locked}
                                onChange={(e) => setEdit({ ...currentEdit, text: e.target.value })}
                              />
                            </label>
                            {item.version !== currentEdit.item.version && (
                              <p role="status" className={s.warning}>
                                Message changed. Cancel and reopen to edit the current version.
                              </p>
                            )}
                            <div className={actions.footer}>
                              <Button size="sm" variant="ghost" onClick={close}>
                                Cancel edit
                              </Button>
                              <Button
                                size="sm"
                                type="submit"
                                disabled={
                                  !currentEdit.text.trim() ||
                                  item.version !== currentEdit.item.version ||
                                  locked ||
                                  !canEdit
                                }
                              >
                                Save queued draft
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <div
                            role="group"
                            aria-label={`Queued message ${position} text`}
                            tabIndex={0}
                            className={n.queueText}
                          >
                            {item.text}
                          </div>
                        )}
                      </div>
                      {(onEdit ||
                        onRequestEdit ||
                        onMove ||
                        onRequestMove ||
                        onCancel ||
                        onRequestCancel ||
                        ((onRetry || onRequestRetry) && item.state === 'failed')) && (
                        <div
                          className={n.actions}
                          role="group"
                          aria-label={`Actions for message ${position}`}
                        >
                          {(onEdit || onRequestEdit) && (
                            <IconButton
                              icon="edit"
                              label={`Edit message ${position}`}
                              disabled={locked || !canEdit}
                              onClick={(e) => {
                                origin.current = e.currentTarget;
                                setEdit({ item, text: item.text, key: state.key });
                              }}
                            />
                          )}
                          {(onMove || onRequestMove) && (
                            <>
                              <IconButton
                                icon="moveUp"
                                label={`Move message ${position} up`}
                                disabled={locked || !canMove || (index === 0 && !previousWindow)}
                                onClick={() => {
                                  if (onRequestMove && scope)
                                    onRequestMove({ ...request(item), direction: 'up' });
                                  else if (!onRequestMove) onMove?.(item, 'up');
                                }}
                              />
                              <IconButton
                                icon="moveDown"
                                label={`Move message ${position} down`}
                                disabled={
                                  locked || !canMove || (index === rows!.length - 1 && !nextWindow)
                                }
                                onClick={() => {
                                  if (onRequestMove && scope)
                                    onRequestMove({ ...request(item), direction: 'down' });
                                  else if (!onRequestMove) onMove?.(item, 'down');
                                }}
                              />
                            </>
                          )}
                          {(onCancel || onRequestCancel) && (
                            <IconButton
                              icon="delete"
                              label={`Remove message ${position}`}
                              disabled={locked || !canCancel}
                              onClick={() => {
                                if (onRequestCancel && scope) onRequestCancel(request(item));
                                else if (!onRequestCancel) onCancel?.(item);
                              }}
                            />
                          )}
                          {item.state === 'failed' && (onRetry || onRequestRetry) && (
                            <IconButton
                              icon="retry"
                              label={`Retry message ${position}`}
                              disabled={locked || !canRetry}
                              onClick={() => {
                                if (onRequestRetry && scope) onRequestRetry(request(item));
                                else if (!onRequestRetry) onRetry?.(item);
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                    <span className={`${s.tag} ${n.state}`}>
                      <AIIcon
                        name={
                          item.pending
                            ? 'pending'
                            : item.state === 'sending'
                              ? 'running'
                              : item.state === 'failed' || item.state === 'outcome-unknown'
                                ? 'warning'
                                : item.state === 'cancelled'
                                  ? 'close'
                                  : item.state === 'sent'
                                    ? 'check'
                                    : 'pending'
                        }
                      />
                      {item.pending
                        ? 'Awaiting confirmation'
                        : item.state === 'outcome-unknown'
                          ? 'Send outcome unknown'
                          : item.state}
                    </span>
                    {item.state === 'outcome-unknown' && (
                      <p className={s.warning}>
                        Reconcile the original send with the host. It will not be retried
                        automatically.
                      </p>
                    )}
                    {item.error && (
                      <p role="alert" className={s.error}>
                        {item.error}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          {edit && (!currentEdit || !rows!.some((item) => item.id === edit.item.id)) && (
            <div className={n.editor}>
              <p role="status" className={s.muted}>
                The draft being edited is outside the current queue window.
              </p>
              <Button size="sm" variant="ghost" onClick={close}>
                Cancel edit
              </Button>
            </div>
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
                      })
                  : !onRequestPage
                    ? onPageChange
                    : undefined
              }
            />
          )}
        </>
      )}
    </div>
  );
}
