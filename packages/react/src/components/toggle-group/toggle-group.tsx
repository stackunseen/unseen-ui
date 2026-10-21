'use client';
import { useId, useRef } from 'react';
import type { ComponentProps, KeyboardEvent, ReactNode } from 'react';
import type { VariantProps } from '../../shared/variants.js';
import { Anchor } from '../../shared/link.js';
import { rovingTarget } from '../../shared/roving-focus.js';
import d from '../../shared/styles/display.module.css';

export interface ToggleGroupOption {
  value: string;
  label: ReactNode;
  /** A host-supplied count shown after the label, for example matching results. */
  count?: ReactNode;
  /** Read by assistive technology after the label; keeps compact segments short. */
  description?: string;
  /** Destination in links mode. */
  href?: string;
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
  /** Required with buttons. Links navigate instead and may omit it. */
  onValueChange?: (value: string | null) => void;
  /** Lets the selected chip be deselected again. */
  allowEmpty?: boolean;
  /**
   * Buttons use radio semantics with one tab stop. Links render anchors with aria-current for
   * URL-driven views, each in the tab order like any navigation, so a server-rendered filter
   * works before hydration; every option then needs an href. A LinkProvider swaps in the
   * host's router link.
   */
  mode?: 'buttons' | 'links';
}
export interface MultipleToggleGroupProps extends ToggleGroupBaseProps {
  type: 'multiple';
  value: readonly string[];
  onValueChange: (value: readonly string[]) => void;
}
export type ToggleGroupProps = SingleToggleGroupProps | MultipleToggleGroupProps;

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
    ...rest
  } = props;
  const allowEmpty = props.type !== 'multiple' && props.allowEmpty === true;
  // Selection props stay out of the DOM element.
  const divProps: Record<string, unknown> = { ...rest };
  for (const key of ['type', 'value', 'onValueChange', 'allowEmpty', 'mode']) delete divProps[key];
  const links = props.type !== 'multiple' && props.mode === 'links';
  const elementProps = divProps as Omit<ComponentProps<'div'>, 'onChange' | 'defaultValue'>;
  const group = useRef<HTMLDivElement>(null);
  const uid = useId();
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
      if (allowEmpty) props.onValueChange?.(null);
    } else props.onValueChange?.(option.value);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (links) return;
    const buttons = [...(group.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    const target = rovingTarget(event, buttons);
    if (!target) return;
    target.focus();
    const option = options.find((item) => item.value === target.dataset.value);
    if (props.type !== 'multiple' && option && props.value !== option.value)
      props.onValueChange?.(option.value);
  }

  return (
    <div
      {...elementProps}
      ref={group}
      role={multiple || links ? 'group' : 'radiogroup'}
      aria-label={label}
      data-variant={variant}
      data-size={size}
      data-part="toggle-group"
      data-mode={links ? 'links' : undefined}
      className={`${d.toggleGroup} ${className}`}
      onKeyDown={(event) => {
        elementProps.onKeyDown?.(event);
        if (!event.defaultPrevented) onKeyDown(event);
      }}
    >
      {options.map((option) => {
        const checked = selected(option);
        const content = (
          <>
            <span>{option.label}</span>
            {option.count !== undefined && option.count !== null && (
              <span className={d.toggleCount}>{option.count}</span>
            )}
            {/* A description, not part of the name: "Search", described as "Search the web". */}
            {option.description && (
              <span id={`${uid}-${option.value}`} hidden>
                {option.description}
              </span>
            )}
          </>
        );
        const describedBy = option.description ? `${uid}-${option.value}` : undefined;
        if (links) {
          const linkProps = {
            'aria-current': checked ? ('page' as const) : undefined,
            'aria-describedby': describedBy,
            'data-value': option.value,
            className: d.toggle,
          };
          return disabled || option.disabled || !option.href ? (
            <a key={option.value} {...linkProps} aria-disabled="true" tabIndex={-1}>
              {content}
            </a>
          ) : (
            <Anchor key={option.value} {...linkProps} href={option.href}>
              {content}
            </Anchor>
          );
        }
        return (
          <button
            key={option.value}
            type="button"
            role={multiple ? undefined : 'radio'}
            aria-checked={multiple ? undefined : checked}
            aria-pressed={multiple ? checked : undefined}
            aria-describedby={describedBy}
            tabIndex={option.value === tabStop ? 0 : -1}
            disabled={disabled || option.disabled}
            data-value={option.value}
            className={d.toggle}
            onClick={() => choose(option)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
