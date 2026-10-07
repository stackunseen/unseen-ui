'use client';
import { useRef } from 'react';
import type { ComponentProps, KeyboardEvent, ReactNode } from 'react';
import type { VariantProps } from '../../shared/variants.js';
import d from '../../shared/styles/display.module.css';

export interface ToggleGroupOption {
  value: string;
  label: ReactNode;
  /** A host-supplied count shown after the label, for example matching results. */
  count?: ReactNode;
  disabled?: boolean;
}
interface ToggleGroupBaseProps
  extends Omit<ComponentProps<'div'>, 'onChange' | 'defaultValue'>, VariantProps<'ToggleGroup'> {
  /** Immutable choices; replace the array when labels or counts change. */
  options: readonly ToggleGroupOption[];
  /** Names the group for assistive technology. */
  label: string;
  size?: 'default' | 'sm';
  disabled?: boolean;
}
export interface SingleToggleGroupProps extends ToggleGroupBaseProps {
  type?: 'single';
  value: string | null;
  onValueChange: (value: string | null) => void;
  /** Lets the selected chip be deselected again. */
  allowEmpty?: boolean;
}
export interface MultipleToggleGroupProps extends ToggleGroupBaseProps {
  type: 'multiple';
  value: readonly string[];
  onValueChange: (value: readonly string[]) => void;
}
export type ToggleGroupProps = SingleToggleGroupProps | MultipleToggleGroupProps;

const navigationKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];

/**
 * A row of filter chips. Single selection uses radio semantics (arrow keys move and select);
 * multiple selection uses pressed buttons (arrow keys move focus, Space or Enter toggles).
 */
export function ToggleGroup(props: ToggleGroupProps) {
  const {
    variant = 'pills',
    options,
    label,
    size = 'default',
    disabled = false,
    className = '',
    type: _type,
    value: _value,
    onValueChange: _onValueChange,
    ...rest
  } = props;
  const allowEmpty = props.type !== 'multiple' && props.allowEmpty === true;
  const divProps = rest as Omit<ComponentProps<'div'>, 'onChange' | 'defaultValue'> & {
    allowEmpty?: boolean;
  };
  delete divProps.allowEmpty;
  const group = useRef<HTMLDivElement>(null);
  const multiple = props.type === 'multiple';
  const selected = (option: ToggleGroupOption) =>
    props.type === 'multiple' ? props.value.includes(option.value) : props.value === option.value;
  const enabled = options.filter((option) => !disabled && !option.disabled);
  // Single selection: the checked chip is the tab stop; otherwise the first enabled chip.
  const tabStop = multiple
    ? enabled[0]?.value
    : (enabled.find(selected)?.value ?? enabled[0]?.value);

  function choose(option: ToggleGroupOption) {
    if (disabled || option.disabled) return;
    if (props.type === 'multiple') {
      const current = props.value;
      props.onValueChange(
        current.includes(option.value)
          ? current.filter((item) => item !== option.value)
          : [...current, option.value],
      );
    } else if (props.value === option.value) {
      if (allowEmpty) props.onValueChange(null);
    } else props.onValueChange(option.value);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!navigationKeys.includes(event.key) || enabled.length === 0) return;
    const buttons = [...(group.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    const focused = buttons.findIndex((button) => button === document.activeElement);
    const enabledIndexes = buttons
      .map((button, index) => (button.disabled ? -1 : index))
      .filter((index) => index >= 0);
    if (enabledIndexes.length === 0) return;
    const position = Math.max(0, enabledIndexes.indexOf(focused));
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? enabledIndexes.length - 1
          : event.key === 'ArrowRight' || event.key === 'ArrowDown'
            ? (position + 1) % enabledIndexes.length
            : (position - 1 + enabledIndexes.length) % enabledIndexes.length;
    event.preventDefault();
    const target = buttons[enabledIndexes[next]!];
    target?.focus();
    const option = options.find((item) => item.value === target?.dataset.value);
    if (!multiple && option && props.value !== option.value) props.onValueChange(option.value);
  }

  return (
    <div
      {...divProps}
      ref={group}
      role={multiple ? 'group' : 'radiogroup'}
      aria-label={label}
      data-variant={variant}
      data-size={size}
      data-part="toggle-group"
      className={`${d.toggleGroup} ${className}`}
      onKeyDown={(event) => {
        divProps.onKeyDown?.(event);
        if (!event.defaultPrevented) onKeyDown(event);
      }}
    >
      {options.map((option) => {
        const checked = selected(option);
        return (
          <button
            key={option.value}
            type="button"
            role={multiple ? undefined : 'radio'}
            aria-checked={multiple ? undefined : checked}
            aria-pressed={multiple ? checked : undefined}
            tabIndex={option.value === tabStop ? 0 : -1}
            disabled={disabled || option.disabled}
            data-value={option.value}
            className={d.toggle}
            onClick={() => choose(option)}
          >
            <span>{option.label}</span>
            {option.count !== undefined && option.count !== null && (
              <span className={d.toggleCount}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
