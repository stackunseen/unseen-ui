'use client';
import type { ComponentProps, CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { AIIcon } from '../../providers/icons/icons.js';
import { Anchor } from '../../shared/link.js';
import d from '../../shared/styles/display.module.css';

interface ChipBaseProps {
  children: ReactNode;
  /** A colour or a CSS custom property reference, shown as a leading dot. */
  swatch?: string;
  size?: 'default' | 'sm';
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
}
export interface LinkChipProps
  extends
    ChipBaseProps,
    Omit<ComponentProps<'a'>, 'href' | 'children' | 'className' | 'style' | 'aria-current'> {
  href: string;
  /** Marks the chip as the current filter with aria-current. */
  active?: boolean;
  /** The aria-current token for an active chip; "true" suits a filter, "page" a destination. */
  current?: 'true' | 'page' | 'step' | 'location' | 'date' | 'time';
  onRemove?: never;
}
const chipOwnKeys = [
  'children',
  'swatch',
  'size',
  'className',
  'style',
  'disabled',
  'href',
  'active',
  'current',
  'onRemove',
  'removeLabel',
] as const;
export interface RemovableChipProps extends ChipBaseProps {
  onRemove: () => void;
  /** Accessible name of the remove control; defaults to "Remove" plus the chip text. */
  removeLabel?: string;
  href?: never;
}
export interface StaticChipProps extends ChipBaseProps {
  href?: never;
  onRemove?: never;
}
export type ChipProps = LinkChipProps | RemovableChipProps | StaticChipProps;

function Swatch({ swatch }: { swatch?: string }) {
  if (!swatch) return null;
  return <span className={d.chipSwatch} aria-hidden="true" style={{ background: swatch }} />;
}

/**
 * A compact label: a link (current), a removable value or static text. For choices, use
 * ToggleGroup.
 * Active fills use --ai-chip-active-background and --ai-chip-active-color, which default to
 * the primary tint and primary text so the label keeps its contrast.
 */
export function Chip(props: ChipProps) {
  const { children, swatch, size = 'default', className = '', style, disabled } = props;
  const base = `${d.chip} ${className}`;
  if ('onRemove' in props && props.onRemove) {
    const text = typeof children === 'string' ? children : undefined;
    const label = props.removeLabel ?? (text ? `Remove ${text}` : 'Remove');
    const remove = () => {
      if (!disabled) props.onRemove();
    };
    const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        remove();
      }
    };
    return (
      <span
        className={base}
        style={style}
        data-part="chip"
        data-size={size}
        data-removable=""
        data-disabled={disabled || undefined}
        onKeyDown={onKeyDown}
      >
        <Swatch swatch={swatch} />
        <span className={d.chipLabel}>{children}</span>
        <button
          type="button"
          className={d.chipRemove}
          aria-label={label}
          disabled={disabled}
          onClick={remove}
        >
          <AIIcon name="close" size={12} />
        </button>
      </span>
    );
  }
  if ('href' in props && props.href) {
    // Every other anchor prop (title, Next's scroll, onClick) reaches the link component.
    const anchorProps: Record<string, unknown> = { ...props };
    for (const key of chipOwnKeys) delete anchorProps[key];
    const linkProps = {
      ...(anchorProps as Omit<ComponentProps<'a'>, 'href'>),
      'aria-current': props.active ? (props.current ?? 'true') : undefined,
      className: base,
      style,
      'data-part': 'chip',
      'data-size': size,
      'data-active': props.active || undefined,
    };
    const label = (
      <>
        <Swatch swatch={swatch} />
        <span className={d.chipLabel}>{children}</span>
      </>
    );
    // A disabled link keeps its place but has no destination, so it stays a plain anchor.
    return disabled ? (
      <a {...linkProps} aria-disabled="true">
        {label}
      </a>
    ) : (
      <Anchor {...linkProps} href={props.href}>
        {label}
      </Anchor>
    );
  }
  return (
    <span className={base} style={style} data-part="chip" data-size={size}>
      <Swatch swatch={swatch} />
      <span className={d.chipLabel}>{children}</span>
    </span>
  );
}

export interface ChipGroupProps extends ComponentProps<'div'> {
  /** Names the group for assistive technology. */
  label: string;
  /** Wrap onto new lines or scroll horizontally without widening the page. */
  overflow?: 'wrap' | 'scroll';
}

export function ChipGroup({ label, overflow = 'wrap', className = '', ...props }: ChipGroupProps) {
  return (
    <div
      role="group"
      aria-label={label}
      {...props}
      data-part="chip-group"
      data-overflow={overflow}
      className={`${d.chipGroup} ${className}`}
    />
  );
}
