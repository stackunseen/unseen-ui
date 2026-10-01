'use client';
import { useLayoutEffect, useRef } from 'react';
import {
  conversationContextKey,
  sameConversationContext,
  inspectConversationContext,
  inspectNavigationOperation,
} from '@ai-interaction/core/conversation';
import type {
  ConversationContext,
  NavigationAvailability,
  ConversationPagination,
  NavigationOperation,
  ConnectionState,
} from '@ai-interaction/core';
import { Button } from '../../components/button/button.js';
import { LoadingIndicator } from '../../components/loading-indicator/loading-indicator.js';
import s from '../styles/agent-controls.module.css';
import n from '../styles/navigation.module.css';
import actions from '../styles/action-layout.module.css';

export interface NavigationStateProps {
  context?: ConversationContext;
  status?: NavigationAvailability;
  connection?: ConnectionState | 'unknown';
  operation?: NavigationOperation;
  onReconcile?: (operation: NavigationOperation) => void;
}

export function navigationState(props: NavigationStateProps, valid: boolean) {
  const status = props.status ?? 'ready',
    visible = status === 'ready' || status === 'stale';
  const context = visible ? inspectConversationContext(props.context) : undefined;
  const contextValid = props.context === undefined || !!context;
  const operation = visible ? inspectNavigationOperation(props.operation) : undefined;
  const obsolete =
    !!operation && (!context || !sameConversationContext(operation.context, context));
  const invalidOperation = props.operation !== undefined && !operation;
  const locked =
    status !== 'ready' ||
    !valid ||
    !contextValid ||
    invalidOperation ||
    obsolete ||
    (operation && ['submitting', 'acknowledged', 'outcome-unknown'].includes(operation.state)) ||
    (props.connection !== undefined && props.connection !== 'connected');
  return {
    status,
    visible,
    context,
    operation,
    obsolete,
    invalidOperation,
    connection: props.connection,
    valid: valid && contextValid,
    key: conversationContextKey(context),
    locked: !!locked,
  };
}

type NavigationState = ReturnType<typeof navigationState>;

export function Notice({
  state,
  onReconcile,
}: {
  state: NavigationState;
  onReconcile?: NavigationStateProps['onReconcile'];
}) {
  if (!state.visible)
    return state.status === 'loading' ? (
      <LoadingIndicator label="Loading conversation data" />
    ) : (
      <p role="status" className={s.muted}>
        {state.status === 'denied'
          ? 'Conversation access denied.'
          : state.status === 'unknown'
            ? 'Conversation availability unknown.'
            : state.status === 'error'
              ? 'Conversation data unavailable.'
              : 'Conversation history unavailable.'}
      </p>
    );
  return (
    <>
      {!state.valid && (
        <p role="alert" className={s.error}>
          Invalid or excessive conversation data.
        </p>
      )}
      {state.status === 'stale' && (
        <p role="status" className={s.warning}>
          Historical conversation data. Refresh with the host before making changes.
        </p>
      )}
      {state.connection !== undefined && state.connection !== 'connected' && (
        <p role="status" className={s.muted}>
          {state.connection === 'reconnecting'
            ? 'Reconnecting conversation host.'
            : state.connection === 'disconnected'
              ? 'Conversation host disconnected.'
              : 'Conversation connection unknown.'}
        </p>
      )}
      {(state.obsolete || state.invalidOperation) && (
        <p role="status" className={s.warning}>
          Conversation request belongs to an invalid or obsolete view. Reconcile with the host.
        </p>
      )}
      {state.operation && !state.obsolete && state.valid && (
        <div className={n.operation}>
          <p role={state.operation.state === 'failed' ? 'alert' : 'status'} className={s.muted}>
            {state.operation.state === 'submitting'
              ? 'Requesting conversation action…'
              : state.operation.state === 'acknowledged'
                ? 'Request acknowledged. Waiting for current host data.'
                : state.operation.state === 'outcome-unknown'
                  ? 'Conversation request outcome unknown. Check the original request before trying again.'
                  : state.operation.state === 'failed'
                    ? state.operation.detail ||
                      'Conversation request failed. Previous host data is retained.'
                    : state.operation.detail || 'No conversation action pending.'}
          </p>
          {state.operation.state === 'outcome-unknown' && onReconcile && (
            <Button
              size="sm"
              variant="outline"
              disabled={
                state.status !== 'ready' ||
                (state.connection !== undefined && state.connection !== 'connected')
              }
              onClick={() =>
                onReconcile({ ...state.operation!, context: { ...state.operation!.context } })
              }
            >
              Check conversation request
            </Button>
          )}
        </div>
      )}
    </>
  );
}

export function Pagination({
  page,
  rows,
  locked,
  onPage,
}: {
  page: ConversationPagination;
  rows: number;
  locked: boolean;
  onPage?: (index: number) => void;
}) {
  const next =
    page.totalItems === undefined
      ? page.hasNextPage === true
      : (page.pageIndex + 1) * page.pageSize < page.totalItems;
  return (
    <div className={n.pagination}>
      <span className={s.muted}>
        {rows
          ? `${page.pageIndex * page.pageSize + 1}–${page.pageIndex * page.pageSize + rows}`
          : 'No items'}
        {page.totalItems === undefined ? ' · Total not reported' : ` of ${page.totalItems}`}
      </span>
      <div role="group" aria-label="Conversation page navigation" className={actions.footer}>
        <Button
          size="sm"
          variant="outline"
          disabled={locked || !onPage || page.pageIndex === 0}
          onClick={() => onPage?.(page.pageIndex - 1)}
        >
          Previous page
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={locked || !onPage || !next}
          onClick={() => onPage?.(page.pageIndex + 1)}
        >
          Next page
        </Button>
      </div>
    </div>
  );
}

export function useNavigationFocus() {
  const root = useRef<HTMLDivElement>(null),
    focused = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (focused.current && !focused.current.isConnected && document.activeElement === document.body)
      root.current?.focus({ preventScroll: true });
  });
  return {
    root,
    events: {
      onFocusCapture: (e: React.FocusEvent<HTMLDivElement>) => {
        focused.current = e.target as HTMLElement;
      },
      onBlurCapture: (e: React.FocusEvent<HTMLDivElement>) => {
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node))
          focused.current = null;
      },
    },
  };
}
