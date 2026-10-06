'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Field } from '../../components/field/field.js';
import { Input } from '../../components/input/input.js';
import { matchingOptions, optionDisabled } from './selection-options.js';
import { SelectionMessage, SelectionPopup } from './selection-popup.js';
import { useOverlayDirection } from '../overlay-direction.js';
import type { SelectionOption, SelectionProps } from './types.js';
import s from './selection.module.css';

export function SelectionPicker<T extends SelectionOption>({
  label,
  options,
  query,
  onQueryChange,
  placeholder = 'Search options',
  description,
  status = 'ready',
  error,
  disabled,
  invalid,
  required,
  filterOption,
  id,
  className = '',
  selection,
  multiple,
  onSelect,
  inputRef,
  children,
  ...props
}: SelectionProps<T> & {
  selection: readonly string[];
  multiple?: boolean;
  onSelect: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  children: (summaryId: string) => ReactNode;
}) {
  const generatedId = useId();
  const controlId = id ?? `selection-${generatedId}`;
  const listId = `${controlId}-options`;
  const [disclosed, setDisclosed] = useState(false);
  const [highlighted, setHighlighted] = useState<string>();
  const listRef = useRef<HTMLDivElement>(null);
  const direction = useOverlayDirection(props.dir);
  const open = disclosed && !disabled;
  const matches = matchingOptions(options, query, filterOption);
  const visible = status === 'ready' ? matches.slice(0, 200) : [];
  const enabled = visible.filter((option) => !optionDisabled(option));
  const active =
    enabled.find((option) => option.value === highlighted)?.value ??
    enabled.find((option) => selection.includes(option.value))?.value ??
    enabled[0]?.value;
  const activeIndex = visible.findIndex((option) => option.value === active);
  const message = disabled
    ? 'Selection is unavailable.'
    : status === 'loading'
      ? 'Loading options…'
      : status === 'error'
        ? error || 'Unable to load options.'
        : open && !visible.length
          ? 'No matching options.'
          : undefined;

  useEffect(() => {
    if (disabled) setDisclosed(false);
  }, [disabled]);

  useEffect(() => {
    if (open && activeIndex >= 0)
      listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  function select(value: string) {
    if (disabled || status !== 'ready' || !enabled.some((option) => option.value === value)) return;
    onSelect(value);
    if (!multiple) setDisclosed(false);
    inputRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setDisclosed(false);
      inputRef.current?.focus();
    } else if (event.key === 'Tab') {
      setDisclosed(false);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setDisclosed(true);
      const index = enabled.findIndex((option) => option.value === active);
      const next = !open
        ? event.key === 'ArrowDown'
          ? 0
          : enabled.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length;
      setHighlighted(enabled[next]?.value);
    } else if (open && (event.key === 'Home' || event.key === 'End')) {
      event.preventDefault();
      setHighlighted(enabled[event.key === 'Home' ? 0 : enabled.length - 1]?.value);
    } else if (open && event.key === 'Enter') {
      event.preventDefault();
      if (active !== undefined) select(active);
    }
  }

  return (
    <Field
      {...props}
      id={controlId}
      label={label}
      description={description}
      disabled={disabled}
      invalid={invalid}
      required={required}
      className={`${s.root} ${className}`}
    >
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          if (!disabled) setDisclosed(next);
        }}
      >
        <Popover.Anchor asChild>
          <Input
            ref={inputRef}
            role="combobox"
            value={query}
            required={false}
            aria-required={required || undefined}
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-activedescendant={
              open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
            }
            aria-describedby={`${controlId}-selection${message ? ` ${controlId}-status` : ''}`}
            placeholder={placeholder}
            autoComplete="off"
            dir={direction}
            onFocus={() => setDisclosed(true)}
            onClick={() => setDisclosed(true)}
            onChange={(event) => {
              onQueryChange(event.target.value);
              setHighlighted(undefined);
              setDisclosed(true);
            }}
            onKeyDown={onKeyDown}
          />
        </Popover.Anchor>
        <SelectionPopup
          inputRef={inputRef}
          listRef={listRef}
          listId={listId}
          label={label}
          dir={direction}
          multiple={multiple}
          loading={status === 'loading'}
          visible={visible}
          selection={selection}
          active={active}
          truncated={status === 'ready' && matches.length > 200}
          message={message}
          error={status === 'error'}
          statusId={`${controlId}-status`}
          onActiveChange={setHighlighted}
          onSelect={select}
          onClose={() => setDisclosed(false)}
        />
      </Popover.Root>
      {children(`${controlId}-selection`)}
      {!open && message && (
        <SelectionMessage
          id={`${controlId}-status`}
          message={message}
          error={status === 'error' && !disabled}
        />
      )}
    </Field>
  );
}
