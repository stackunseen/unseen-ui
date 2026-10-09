'use client';
import { useRef } from 'react';
import type { ComponentProps, KeyboardEvent, ReactNode } from 'react';
import { rovingTarget } from '../../shared/roving-focus.js';
import { VisuallyHidden } from '../visually-hidden/visually-hidden.js';
import d from '../../shared/styles/display.module.css';

export interface SegmentedOption {
  value: string;
  label: ReactNode;
  /** Read by assistive technology after the label; keeps the joined buttons compact. */
  description?: string;
  /** Link mode destination. */
  href?: string;
  disabled?: boolean;
}
export interface SegmentedControlProps extends Omit<
  ComponentProps<'div'>,
  'onChange' | 'defaultValue'
> {
  /** Names the group. */
  label: string;
  /** Immutable choices; replace the array when labels change. */
  options: readonly SegmentedOption[];
  value: string;
  /** Required in button mode. Link mode navigates instead and may omit it. */
  onValueChange?: (value: string) => void;
  /**
   * Buttons use radio semantics. Links render anchors with aria-current for URL-driven views,
   * so a server-rendered filter works before hydration; every option then needs an href.
   */
  mode?: 'buttons' | 'links';
  size?: 'default' | 'sm';
  disabled?: boolean;
}

/** A single choice shown as joined segments. The host owns the value. */
export function SegmentedControl({
  label,
  options,
  value,
  onValueChange,
  mode = 'buttons',
  size = 'default',
  disabled = false,
  className = '',
  onKeyDown,
  ...props
}: SegmentedControlProps) {
  const group = useRef<HTMLDivElement>(null);
  const links = mode === 'links';
  const enabled = options.filter((option) => !disabled && !option.disabled);
  const tabStop = enabled.find((option) => option.value === value)?.value ?? enabled[0]?.value;

  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    const items = [...(group.current?.querySelectorAll<HTMLElement>('[data-value]') ?? [])];
    const target = rovingTarget(event, items, (item) =>
      links ? item.getAttribute('aria-disabled') === 'true' : (item as HTMLButtonElement).disabled,
    );
    if (!target) return;
    target.focus();
    const next = target.dataset.value;
    if (!links && next !== undefined && next !== value) onValueChange?.(next);
  }

  return (
    <div
      {...props}
      ref={group}
      role={links ? 'group' : 'radiogroup'}
      aria-label={label}
      data-part="segmented-control"
      data-size={size}
      data-mode={mode}
      className={`${d.segmented} ${className}`}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented) navigate(event);
      }}
    >
      {options.map((option) => {
        const current = option.value === value;
        const unavailable = disabled || option.disabled === true;
        const content = (
          <>
            <span>{option.label}</span>
            {option.description && <VisuallyHidden>{` ${option.description}`}</VisuallyHidden>}
          </>
        );
        if (links)
          return (
            <a
              key={option.value}
              href={unavailable ? undefined : option.href}
              aria-current={current ? 'page' : undefined}
              aria-disabled={unavailable ? true : undefined}
              tabIndex={unavailable ? -1 : option.value === tabStop ? 0 : -1}
              data-value={option.value}
              className={d.segment}
            >
              {content}
            </a>
          );
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={current}
            tabIndex={option.value === tabStop ? 0 : -1}
            disabled={unavailable}
            data-value={option.value}
            className={d.segment}
            onClick={() => {
              if (!current) onValueChange?.(option.value);
            }}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
