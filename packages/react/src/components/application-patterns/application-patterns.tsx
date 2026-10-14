'use client';
import { useId, useRef } from 'react';
import type { ComponentPropsWithoutRef, ReactNode, RefObject } from 'react';
import { Button } from '../button/button.js';
import { Field } from '../field/field.js';
import { Input } from '../input/input.js';
import { Select } from '../select/select.js';
import { AlertDialog } from '../alert-dialog/alert-dialog.js';
import { Chip, ChipGroup } from '../chip/chip.js';
import { Popover, PopoverContent, PopoverTrigger } from '../popover/popover.js';
import { SegmentedControl } from '../segmented-control/segmented-control.js';
import type { SegmentedOption } from '../segmented-control/segmented-control.js';
import type { SelectChoice, SelectOption } from '../select/select.js';
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

export interface FilterBarFacetOption {
  value: string;
  label: ReactNode;
  /** Shown after the label as a muted count. */
  count?: number;
  /** URL-driven facets render link chips; omit it for toggle chips. */
  href?: string;
  swatch?: string;
}
export interface FilterBarFacet {
  label: string;
  options: readonly FilterBarFacetOption[];
  selected: readonly string[];
  /** Required for toggle chips; link chips navigate instead. */
  onToggle?: (value: string) => void;
  overflow?: 'wrap' | 'scroll';
}
export interface FilterBarOrder {
  label: string;
  options: readonly SegmentedOption[];
  value: string;
  onValueChange?: (value: string) => void;
  /** Links render anchors for URL-driven views. */
  mode?: 'buttons' | 'links';
}
export interface FilterBarSelect {
  name: string;
  label: string;
  /** null means any value; the first option says so. */
  value: string | null;
  options: readonly SelectChoice[];
  onValueChange: (value: string | null) => void;
  /** Defaults to "Any" plus the lower-cased label. */
  anyLabel?: string;
}
export interface FilterBarProps extends Omit<ComponentPropsWithoutRef<'div'>, 'onChange'> {
  /** Names the region; defaults to "Filters". */
  label?: string;
  searchLabel: string;
  search: string;
  onSearchChange: (value: string) => void;
  /** Called on Enter or the search form's submit; omit it to filter as the host types. */
  onSearchSubmit?: () => void;
  searchPlaceholder?: string;
  /** A single-choice order or view switch, as buttons or links. */
  order?: FilterBarOrder;
  /** The main facet as a chip row. */
  facet?: FilterBarFacet;
  /** Secondary facets as selects with an "Any" option. */
  selects?: readonly FilterBarSelect[];
  /** Shown when some filter is active. */
  onClear?: () => void;
  clearLabel?: string;
  summary?: ReactNode;
  disabled?: boolean;
  /**
   * open shows every facet in the bar. popover keeps the facet chips and selects behind a
   * Filters button that counts the active ones, and shows each active filter as a removable
   * token; toggle facets and selects can be removed from a token, link facets show as current.
   */
  presentation?: 'open' | 'popover';
  /** Names the popover trigger and its heading. */
  filtersLabel?: string;
}

const ANY = '__any';

/**
 * One compact bar above a filtered list: search and order, the main facet as chips, the rest
 * as selects with an "Any" option. The host owns every value, usually in the URL; link mode
 * on the order and facet renders anchors, which a LinkProvider turns into router links.
 */
export function FilterBar({
  label = 'Filters',
  searchLabel,
  search,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder,
  order,
  facet,
  selects,
  onClear,
  clearLabel = 'Clear filters',
  summary,
  disabled,
  presentation = 'open',
  filtersLabel = 'Filters',
  className = '',
  ...props
}: FilterBarProps) {
  const activeCount =
    (facet?.selected.length ?? 0) +
    (selects?.filter((select) => select.value !== null).length ?? 0);
  const active = search !== '' || activeCount > 0;
  const chips = facet && (
    <ChipGroup label={facet.label} overflow={facet.overflow}>
      {facet.options.map((option) => {
        const selected = facet.selected.includes(option.value);
        const text = (
          <>
            {option.label}
            {option.count !== undefined && (
              <span className={s.facetCount}>{` ${option.count}`}</span>
            )}
          </>
        );
        return option.href ? (
          <Chip
            key={option.value}
            href={option.href}
            active={selected}
            swatch={option.swatch}
            disabled={disabled}
          >
            {text}
          </Chip>
        ) : (
          <Chip
            key={option.value}
            pressed={selected}
            onPressedChange={() => facet.onToggle?.(option.value)}
            swatch={option.swatch}
            disabled={disabled}
          >
            {text}
          </Chip>
        );
      })}
    </ChipGroup>
  );
  const selectControls = selects?.map((select) => (
    <Select
      key={select.name}
      name={select.name}
      label={select.label}
      value={select.value ?? ANY}
      onValueChange={(value) => select.onValueChange(value === ANY ? null : value)}
      options={[
        { value: ANY, label: select.anyLabel ?? `Any ${select.label.toLowerCase()}` },
        ...select.options,
      ]}
      disabled={disabled}
    />
  ));
  const clear = onClear && active && (
    <Button variant="ghost" size="sm" onClick={onClear} disabled={disabled}>
      {clearLabel}
    </Button>
  );
  const optionLabel = (choices: readonly SelectChoice[], value: string): ReactNode =>
    choices
      .flatMap((choice) => ('options' in choice ? choice.options : [choice]))
      .find((option) => option.value === value)?.label ?? value;
  const tokens = presentation === 'popover' && activeCount > 0 && (
    <ChipGroup label="Active filters" className={s.tokens}>
      {facet?.selected.map((value) => {
        const option = facet.options.find((entry) => entry.value === value);
        const text = option?.label ?? value;
        return option?.href ? (
          <Chip key={`facet-${value}`} href={option.href} active swatch={option.swatch} size="sm">
            {text}
          </Chip>
        ) : (
          <Chip
            key={`facet-${value}`}
            onRemove={() => facet.onToggle?.(value)}
            removeLabel={`Remove ${typeof text === 'string' ? text : value}`}
            swatch={option?.swatch}
            size="sm"
            disabled={disabled}
          >
            {text}
          </Chip>
        );
      })}
      {selects
        ?.filter((select) => select.value !== null)
        .map((select) => (
          <Chip
            key={`select-${select.name}`}
            onRemove={() => select.onValueChange(null)}
            removeLabel={`Remove ${select.label} filter`}
            size="sm"
            disabled={disabled}
          >
            {select.label}: {optionLabel(select.options, select.value!)}
          </Chip>
        ))}
    </ChipGroup>
  );
  if (presentation === 'popover')
    return (
      <div {...props} role="region" aria-label={label} className={`${s.filterBar} ${className}`}>
        <div className={s.toolbarRow}>
          <form
            role="search"
            className={s.search}
            onSubmit={(event) => {
              event.preventDefault();
              onSearchSubmit?.();
            }}
          >
            <Field label={searchLabel}>
              <Input
                type="search"
                value={search}
                onChange={(event) => onSearchChange(event.currentTarget.value)}
                placeholder={searchPlaceholder}
                disabled={disabled}
              />
            </Field>
          </form>
          {order && (
            <SegmentedControl
              label={order.label}
              options={order.options}
              value={order.value}
              onValueChange={order.onValueChange}
              mode={order.mode}
              disabled={disabled}
              className={s.order}
            />
          )}
          {(facet || (selects && selects.length > 0)) && (
            <Popover>
              <PopoverTrigger
                className={s.filtersTrigger}
                disabled={disabled}
                data-active={activeCount > 0 || undefined}
              >
                {filtersLabel}
                {activeCount > 0 && <span className={s.filtersCount}>{activeCount}</span>}
              </PopoverTrigger>
              <PopoverContent title={filtersLabel} headingLevel={3} className={s.filtersPopover}>
                <div className={s.filtersBody}>
                  {chips}
                  {selectControls && selectControls.length > 0 && (
                    <div className={s.filters}>{selectControls}</div>
                  )}
                  {clear}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        {tokens}
        {summary !== undefined && (
          <p role="status" className={s.summary}>
            {summary}
          </p>
        )}
      </div>
    );
  return (
    <div {...props} role="region" aria-label={label} className={`${s.filterBar} ${className}`}>
      <div className={s.toolbarRow}>
        <form
          role="search"
          className={s.search}
          onSubmit={(event) => {
            event.preventDefault();
            onSearchSubmit?.();
          }}
        >
          <Field label={searchLabel}>
            <Input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.currentTarget.value)}
              placeholder={searchPlaceholder}
              disabled={disabled}
            />
          </Field>
        </form>
        {order && (
          <SegmentedControl
            label={order.label}
            options={order.options}
            value={order.value}
            onValueChange={order.onValueChange}
            mode={order.mode}
            disabled={disabled}
            className={s.order}
          />
        )}
      </div>
      {chips}
      {((selects && selects.length > 0) || (onClear && active)) && (
        <div className={s.filters}>
          {selectControls}
          {clear}
        </div>
      )}
      {summary !== undefined && (
        <p role="status" className={s.summary}>
          {summary}
        </p>
      )}
    </div>
  );
}
