'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  ArchiveIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  DotsHorizontalIcon,
  PlusIcon,
  ViewVerticalIcon,
  GlobeIcon,
  Pencil2Icon,
} from '@radix-ui/react-icons';
import type { SVGProps } from 'react';
import { AIIcon } from '../../providers/icons/icons.js';
import type { IconName, IconComponent } from '../../providers/icons/icons.js';
import { Button } from '../button/button.js';
import type { ButtonProps } from '../button/button.js';
import { IconHint } from '../icon-hint/icon-hint.js';
import s from './icon-button.module.css';

const actions: Partial<Record<IconName, IconComponent>> = {
  archive: ArchiveIcon,
  delete: TrashIcon,
  search: MagnifyingGlassIcon,
  moveUp: ArrowUpIcon,
  moveDown: ArrowDownIcon,
  helpful: ThumbUp,
  unhelpful: ThumbDown,
  more: DotsHorizontalIcon,
  attach: PlusIcon,
  sidebar: ViewVerticalIcon,
  globe: GlobeIcon,
  newChat: Pencil2Icon,
  microphone: Microphone,
};
// Radix has no thumbs; these match its 15px grid. The filled ones mark a rating already given.
const thumbPath =
  'M4.5 6.5v6.5M4.5 6.5 7 1.8c.9 0 1.6.8 1.4 1.7L8 5.5h3.4c.9 0 1.5.8 1.3 1.7l-.9 4.6c-.1.7-.7 1.2-1.4 1.2H4.5M2 6.5h2.5V13H2Z';
export function ThumbUp(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
      {...props}
    >
      <path d={thumbPath} />
    </svg>
  );
}
export function ThumbDown(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
      {...props}
    >
      <path d={thumbPath} transform="rotate(180 7.5 7.5)" />
    </svg>
  );
}
export function ThumbUpFilled(props: SVGProps<SVGSVGElement>) {
  return <ThumbUp fill="currentColor" {...props} />;
}
export function ThumbDownFilled(props: SVGProps<SVGSVGElement>) {
  return <ThumbDown fill="currentColor" {...props} />;
}
// Radix has no microphone; this matches its 15px grid and stroke weight.
function Microphone(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="15"
      height="15"
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
    </svg>
  );
}
export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'aria-label' | 'size'> {
  label: string;
  /** A built-in icon name, or your own icon component (such as one from @radix-ui/react-icons). */
  icon: IconName | IconComponent;
}
/** Secondary row actions: a stable hit target with a required accessible name. */
export function IconButton({
  label,
  icon,
  variant = 'ghost',
  className = '',
  title,
  disabled,
  hidden,
  onFocus,
  onBlur,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onKeyDown,
  'aria-describedby': describedBy,
  ...props
}: IconButtonProps) {
  const id = useId();
  const [target, setTarget] = useState<HTMLButtonElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const text = title ?? label;
  const clearTimer = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
  }, []);
  const dismiss = useCallback(() => {
    clearTimer();
    setTarget(null);
  }, [clearTimer]);
  useEffect(() => clearTimer, [clearTimer]);
  useEffect(() => {
    if (disabled || hidden || !text) dismiss();
  }, [disabled, hidden, text, dismiss]);
  function show(button: HTMLButtonElement) {
    clearTimer();
    if (!disabled && !hidden && text) setTarget(button);
  }
  function leave(button: HTMLButtonElement) {
    clearTimer();
    if (button === button.ownerDocument.activeElement && button.matches(':focus-visible')) return;
    // Give the pointer time to cross the gap into the non-interactive hint.
    timer.current = setTimeout(dismiss, 150);
  }
  const visible = target && !disabled && !hidden && text;
  const hasDescription = !!text && text !== label;
  const description =
    [describedBy, hasDescription ? id : undefined].filter(Boolean).join(' ') || undefined;
  return (
    <>
      <Button
        {...props}
        variant={variant}
        size="sm"
        disabled={disabled}
        hidden={hidden}
        aria-label={label}
        aria-describedby={description}
        data-part="icon-button"
        className={`${s.root} ${className}`}
        onFocus={(event) => {
          onFocus?.(event);
          if (!event.defaultPrevented && event.currentTarget.matches(':focus-visible'))
            show(event.currentTarget);
        }}
        onBlur={(event) => {
          onBlur?.(event);
          dismiss();
        }}
        onPointerEnter={(event) => {
          onPointerEnter?.(event);
          if (!event.defaultPrevented && event.pointerType !== 'touch') show(event.currentTarget);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          leave(event.currentTarget);
        }}
        onPointerDown={(event) => {
          onPointerDown?.(event);
          dismiss();
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') dismiss();
        }}
      >
        {typeof icon === 'string' ? (
          <AIIcon name={icon} fallbackIcon={actions[icon]} />
        ) : (
          // A host icon: no provider override applies, so the name only marks it as an icon.
          <AIIcon name={'custom' as IconName} icon={icon} />
        )}
        <span className={s.fallback}>{label}</span>
        {hasDescription && (
          <span id={id} hidden>
            {text}
          </span>
        )}
      </Button>
      {visible && (
        <IconHint
          target={target}
          text={text}
          onDismiss={dismiss}
          onPointerEnter={clearTimer}
          onPointerLeave={() => leave(target)}
        />
      )}
    </>
  );
}
