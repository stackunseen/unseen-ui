'use client';
import { useId, useRef } from 'react';
import type { ComponentPropsWithoutRef, ReactNode, RefObject } from 'react';
import { Button } from '../button/button.js';
import { Field } from '../field/field.js';
import { Input } from '../input/input.js';
import { Select } from '../select/select.js';
import { AlertDialog } from '../alert-dialog/alert-dialog.js';
import type { SelectOption } from '../select/select.js';
import s from './application-patterns.module.css';

export interface PageHeaderProps extends Omit<ComponentPropsWithoutRef<'header'>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  /** Choose the heading level for the containing page, without changing its appearance. */
  headingLevel?: 1 | 2 | 3;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  description,
  headingLevel = 1,
  breadcrumb,
  actions,
  className = '',
  ...props
}: PageHeaderProps) {
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3';
  return (
    <header {...props} className={`${s.pageHeader} ${className}`}>
      {breadcrumb && <div className={s.breadcrumb}>{breadcrumb}</div>}
      <div className={s.headerRow}>
        <div className={s.headingGroup}>
          <Heading className={s.title}>{title}</Heading>
          {description && <p className={s.description}>{description}</p>}
        </div>
        {actions && <div className={s.actions}>{actions}</div>}
      </div>
    </header>
  );
}

export interface OrgSwitcherProps {
  label?: string;
  value: string;
  organizations: readonly SelectOption[];
  /** Emits a requested scope; the host may first show an unsaved-draft guard. */
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function OrgSwitcher({
  label = 'Organization',
  organizations,
  className = '',
  ...props
}: OrgSwitcherProps) {
  return (
    <Field label={label} labelAs="span" className={className}>
      <Select {...props} aria-label={label} options={organizations} />
    </Field>
  );
}

export interface ListToolbarProps extends Omit<ComponentPropsWithoutRef<'div'>, 'onChange'> {
  searchLabel: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  disabled?: boolean;
  filters?: ReactNode;
  actions?: ReactNode;
  summary?: ReactNode;
}

export function ListToolbar({
  searchLabel,
  search,
  onSearchChange,
  searchPlaceholder,
  disabled,
  filters,
  actions,
  summary,
  className = '',
  ...props
}: ListToolbarProps) {
  return (
    <div {...props} className={`${s.listToolbar} ${className}`}>
      <div className={s.toolbarRow}>
        <Field label={searchLabel} className={s.search}>
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.currentTarget.value)}
            placeholder={searchPlaceholder}
            disabled={disabled}
          />
        </Field>
        {filters && <div className={s.filters}>{filters}</div>}
        {actions && <div className={s.actions}>{actions}</div>}
      </div>
      {summary !== undefined && (
        <p role="status" className={s.summary}>
          {summary}
        </p>
      )}
    </div>
  );
}

export interface MasterDetailProps extends ComponentPropsWithoutRef<'div'> {
  list: ReactNode;
  listLabel: string;
  detail: ReactNode;
  detailLabel: string;
  /** Controls which pane appears on narrow screens. Desktop retains both panes. */
  activePane: 'list' | 'detail';
}

export function MasterDetail({
  list,
  listLabel,
  detail,
  detailLabel,
  activePane,
  className = '',
  ...props
}: MasterDetailProps) {
  return (
    <div {...props} className={`${s.masterDetail} ${className}`} data-active-pane={activePane}>
      <section aria-label={listLabel} className={s.listPane}>
        {list}
      </section>
      <section aria-label={detailLabel} className={s.detailPane}>
        {detail}
      </section>
    </div>
  );
}

export type SettingsSaveState =
  | { status: 'idle' }
  | { status: 'pending'; message?: string }
  | { status: 'acknowledged'; message: string }
  | { status: 'rejected'; message: string }
  | { status: 'unknown'; message: string };

export interface SettingsSaveCancelProps {
  dirty: boolean;
  state: SettingsSaveState;
  canSave?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  /** Binds a submit button to a containing or external form. */
  form?: string;
  onSave?: () => void;
  onCancel: () => void;
  /** Looks up the original receipt. It must not resubmit the action. */
  onReconcile?: () => void;
  className?: string;
}

export function SettingsSaveCancel({
  dirty,
  state,
  canSave = true,
  saveLabel = 'Save changes',
  cancelLabel = 'Cancel',
  form,
  onSave,
  onCancel,
  onReconcile,
  className = '',
}: SettingsSaveCancelProps) {
  const id = useId();
  const blocked = state.status === 'pending' || state.status === 'unknown';
  return (
    <div
      className={`${s.saveFooter} ${className}`}
      aria-busy={state.status === 'pending' || undefined}
    >
      <p id={id} className={s.summary} role={state.status === 'rejected' ? 'alert' : 'status'}>
        {state.status === 'idle'
          ? dirty
            ? 'Unsaved changes'
            : 'No unsaved changes'
          : state.status === 'pending'
            ? (state.message ?? 'Waiting for the host receipt…')
            : state.message}
      </p>
      <div className={s.actions}>
        <Button variant="outline" disabled={!dirty || blocked} onClick={onCancel}>
          {cancelLabel}
        </Button>
        {state.status === 'unknown' ? (
          <Button disabled={!onReconcile} onClick={onReconcile} aria-describedby={id}>
            Check original receipt
          </Button>
        ) : (
          <Button
            type={form ? 'submit' : 'button'}
            form={form}
            onClick={form ? undefined : onSave}
            disabled={!dirty || !canSave || blocked}
            aria-describedby={id}
          >
            {state.status === 'pending' ? 'Saving…' : saveLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export interface UnsavedGuardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeepEditing: () => void;
  /** Discards only the local draft; it does not authorize or execute a host operation. */
  onDiscard: () => void;
  destination?: string;
  /** The requesting control, captured before opening a guard without a Trigger. */
  returnFocusRef?: RefObject<HTMLElement | null>;
}

export function UnsavedGuard({
  open,
  onOpenChange,
  onKeepEditing,
  onDiscard,
  destination,
  returnFocusRef,
}: UnsavedGuardProps) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Content
        onOpenAutoFocus={(event) => {
          const active = (event.target as HTMLElement | null)?.ownerDocument.activeElement;
          returnFocus.current =
            returnFocusRef?.current ??
            (active && 'focus' in active ? (active as HTMLElement) : null);
        }}
        onCloseAutoFocus={(event) => {
          const target = returnFocusRef?.current ?? returnFocus.current;
          if (target?.isConnected) {
            event.preventDefault();
            target.focus({ preventScroll: true });
          }
        }}
      >
        <AlertDialog.Title>Discard unsaved changes?</AlertDialog.Title>
        <AlertDialog.Description>
          {destination
            ? `Your draft has not been saved. Discard it to open ${destination}?`
            : 'Your draft has not been saved. Discard it to leave this view?'}
        </AlertDialog.Description>
        <AlertDialog.Actions>
          <AlertDialog.Cancel onClick={onKeepEditing}>Keep editing</AlertDialog.Cancel>
          <AlertDialog.Action onAction={onDiscard}>Discard draft</AlertDialog.Action>
        </AlertDialog.Actions>
      </AlertDialog.Content>
    </AlertDialog>
  );
}
