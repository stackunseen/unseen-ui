'use client';
import type { ComponentProps, CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { AIIcon } from '../../providers/icons/icons.js';
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
export interface ToggleChipProps extends ChipBaseProps {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  href?: never;
  onRemove?: never;
}
export interface LinkChipProps extends ChipBaseProps {
  href: string;
  /** Marks the chip as the current filter with aria-current. */
  active?: boolean;
  target?: string;
  rel?: string;
  pressed?: never;
  onRemove?: never;
}
export interface RemovableChipProps extends ChipBaseProps {
  onRemove: () => void;
  /** Accessible name of the remove control; defaults to "Remove" plus the chip text. */
  removeLabel?: string;
  pressed?: never;
  href?: never;
}
export interface StaticChipProps extends ChipBaseProps {
  pressed?: never;
  href?: never;
  onRemove?: never;
}
export type ChipProps = ToggleChipProps | LinkChipProps | RemovableChipProps | StaticChipProps;

function Swatch({ swatch }: { swatch?: string }) {
  if (!swatch) return null;
  return <span className={d.chipSwatch} aria-hidden="true" style={{ background: swatch }} />;
}

/**
 * A compact interactive label: a toggle (pressed), a link (current) or a removable value.
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
    return (
      <a
        href={disabled ? undefined : props.href}
        target={props.target}
        rel={props.rel}
        aria-current={props.active ? 'page' : undefined}
        aria-disabled={disabled || undefined}
        className={base}
        style={style}
        data-part="chip"
        data-size={size}
        data-active={props.active || undefined}
      >
        <Swatch swatch={swatch} />
        <span className={d.chipLabel}>{children}</span>
      </a>
    );
  }
  if ('pressed' in props && typeof props.pressed === 'boolean') {
    const { pressed, onPressedChange } = props;
    return (
      <button
        type="button"
        aria-pressed={pressed}
        disabled={disabled}
        className={base}
        style={style}
        data-part="chip"
        data-size={size}
        onClick={() => onPressedChange(!pressed)}
      >
        <Swatch swatch={swatch} />
        <span className={d.chipLabel}>{children}</span>
      </button>
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
