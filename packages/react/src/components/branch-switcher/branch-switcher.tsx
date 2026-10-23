'use client';
import { useEffect, useRef, useState } from 'react';
import {
  inspectBranchWindow,
  inspectConversationPagination,
  inspectBranchChangeGuard,
} from '@stackunseen/ui-core/conversation';
import type {
  ConversationPagination,
  ConversationBranch,
  BranchSelectionRequest,
  ConversationPageRequest,
  BranchChangeGuard,
} from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { Select } from '../select/select.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/agent-controls.module.css';
import n from '../../shared/styles/navigation.module.css';
import actions from '../../shared/styles/action-layout.module.css';
import type { NavigationStateProps } from '../../shared/conversation-navigation/conversation-navigation.js';
import {
  navigationState,
  useNavigationFocus,
  Notice,
  Pagination,
} from '../../shared/conversation-navigation/conversation-navigation.js';

export interface BranchSwitcherProps extends VariantProps<'BranchSwitcher'>, NavigationStateProps {
  branches: readonly ConversationBranch[];
  value?: string;
  onValueChange?: (branch: ConversationBranch) => void;
  onRequestSelect?: (request: BranchSelectionRequest) => void;
  disabled?: boolean;
  changeGuard?: BranchChangeGuard;
  pagination?: ConversationPagination;
  onPageChange?: (index: number) => void;
  onRequestPage?: (request: ConversationPageRequest) => void;
}

export function BranchSwitcher(props: BranchSwitcherProps) {
  const {
    branches,
    value,
    onValueChange,
    onRequestSelect,
    disabled,
    changeGuard,
    pagination,
    onPageChange,
    onRequestPage,
    variant = 'segmented',
  } = props;
  const visible = (props.status ?? 'ready') === 'ready' || props.status === 'stale',
    rows = visible ? inspectBranchWindow(branches) : undefined;
  const page =
      visible && pagination
        ? inspectConversationPagination(pagination, rows?.length ?? 0, 50)
        : undefined,
    guard = visible && changeGuard ? inspectBranchChangeGuard(changeGuard) : undefined;
  const state = navigationState(
    props,
    !!rows && (!pagination || !!page) && (!changeGuard || !!guard),
  );
  const scope = state.context,
    canSelect = onRequestSelect ? !!scope : !!onValueChange,
    locked = state.locked || disabled || !canSelect;
  const { root, events } = useNavigationFocus();
  const guardOrigin = useRef<HTMLElement | null>(null),
    guardCancel = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState<{
    branch: ConversationBranch;
    key: string;
    origin?: string;
    guardVersion: string;
  }>();
  const current = rows?.find((row) => row.id === value),
    target = pending && rows?.find((row) => row.id === pending.branch.id);
  const pendingCurrent =
    !!pending &&
    pending.key === state.key &&
    pending.origin === value &&
    pending.guardVersion === guard?.version &&
    target?.version === pending.branch.version;
  useEffect(() => {
    guardCancel.current?.focus();
  }, [pending?.branch.id, pending?.key]);
  function closeGuard() {
    setPending(undefined);
    if (guardOrigin.current?.isConnected) guardOrigin.current.focus();
    else root.current?.focus();
  }
  function select(row: ConversationBranch) {
    if (onRequestSelect && scope)
      onRequestSelect({ context: { ...scope }, branchId: row.id, branchVersion: row.version });
    else if (!onRequestSelect) onValueChange?.(row);
  }
  function choose(row: ConversationBranch) {
    if (row.id === value || locked) return;
    if (guard) {
      guardOrigin.current =
        variant === 'select'
          ? (root.current?.querySelector<HTMLButtonElement>('button[role="combobox"]') ?? null)
          : (document.activeElement as HTMLElement);
      setPending({ branch: row, key: state.key, origin: value, guardVersion: guard.version });
    } else select(row);
  }
  return (
    <div
      ref={root}
      {...events}
      tabIndex={-1}
      role="group"
      aria-label="Conversation branches"
      className={s.root}
      data-part="branch-switcher"
      data-variant={variant}
      data-status={state.status}
    >
      <strong>Conversation branch</strong>
      <Notice state={state} onReconcile={props.onReconcile} />
      {state.visible && state.valid && (
        <>
          {!rows!.length ? (
            <p className={s.muted}>No branches available.</p>
          ) : variant === 'select' ? (
            <Select
              aria-label="Conversation branch"
              value={current?.id ?? ''}
              disabled={locked}
              options={rows!.map((row) => ({ value: row.id, label: row.label }))}
              onValueChange={(id) => {
                const row = rows!.find((row) => row.id === id);
                if (row) choose(row);
              }}
              onCloseAutoFocus={(event) => {
                if (pending && guardCancel.current) {
                  event.preventDefault();
                  guardCancel.current.focus();
                }
              }}
            />
          ) : (
            <div className={variant === 'cards' ? s.options : n.branchSegments}>
              {rows!.map((row) => (
                <Button
                  size={variant === 'cards' ? 'default' : 'sm'}
                  variant={
                    variant === 'cards' ? (row.id === value ? 'secondary' : 'outline') : 'ghost'
                  }
                  disabled={locked}
                  aria-pressed={row.id === value}
                  key={row.id}
                  onClick={() => choose(row)}
                >
                  {row.label}
                </Button>
              ))}
            </div>
          )}
          {current ? (
            <p className={s.muted}>
              Version {current.version}
              {current.parentId
                ? ` · Parent ${current.parentId} · Parent version ${current.parentVersion ?? 'not reported'}`
                : ''}
              {current.detail ? ` · ${current.detail}` : ''}
            </p>
          ) : (
            rows!.length > 0 && (
              <p role="status" className={s.warning}>
                {value
                  ? 'The selected branch isn’t loaded right now.'
                  : 'No conversation branch selected.'}
              </p>
            )
          )}
          {pending && (
            <div className={n.changeGuard} role="group" aria-label="Confirm branch change">
              <p role="status" className={s.warning}>
                {pendingCurrent
                  ? guard!.message
                  : 'Branch or draft changed. Cancel and choose the current branch again.'}
              </p>
              {pendingCurrent && <p>Switch to {target!.label}?</p>}
              <div className={actions.footer}>
                <Button ref={guardCancel} size="sm" variant="ghost" onClick={closeGuard}>
                  Keep current branch
                </Button>
                <Button
                  size="sm"
                  disabled={locked || !pendingCurrent}
                  onClick={() => {
                    if (pendingCurrent && target) {
                      select(target);
                      closeGuard();
                    }
                  }}
                >
                  Change branch
                </Button>
              </div>
            </div>
          )}
          {page && (
            <Pagination
              page={page}
              rows={rows!.length}
              locked={!!locked}
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
