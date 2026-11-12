'use client';
import { useEffect, useId, useRef } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { ChatBubbleIcon, Cross2Icon } from '@radix-ui/react-icons';
import s from './chat-launcher.module.css';

export interface ChatLauncherProps extends ComponentProps<'div'> {
  /** Whether the chat panel is open. Controlled by the host. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Heading of the panel, such as "Ask Acme". It also names the panel. */
  title: string;
  /** Accessible name of the bubble. */
  label?: string;
  /** The chat itself, usually <Chat />. Kept mounted while closed so the conversation survives. */
  children: ReactNode;
  /** Which bottom corner the bubble sits in. */
  placement?: 'bottom-end' | 'bottom-start';
  /** Unread replies, shown on the bubble while the panel is closed. */
  unread?: number;
  className?: string;
}

/** Hiding a focused element drops focus to the body, so treat that as still inside. */
function focusWasInside(container: HTMLElement | null) {
  const active = document.activeElement;
  return !active || active === document.body || Boolean(container?.contains(active));
}

/**
 * A floating chat bubble for a website that opens a chat panel above it. On a phone the panel
 * fills the screen. Escape or the close button returns focus to the bubble.
 */
export function ChatLauncher({
  open,
  onOpenChange,
  title,
  label = 'Open chat',
  children,
  placement = 'bottom-end',
  unread = 0,
  className = '',
  ...rest
}: ChatLauncherProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(open);
  useEffect(() => {
    if (open && !wasOpen.current) {
      // Start in the composer when there is one, as people open a chat to type.
      const target =
        panel.current?.querySelector<HTMLElement>('textarea:not([disabled])') ??
        panel.current?.querySelector<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        );
      (target ?? panel.current)?.focus();
    } else if (!open && wasOpen.current && focusWasInside(panel.current)) {
      bubble.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);
  const count = Number.isFinite(unread) && unread > 0 ? Math.min(Math.round(unread), 99) : 0;
  return (
    <div
      {...rest}
      className={`${s.root} ${className}`}
      data-part="chat-launcher"
      data-placement={placement}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        tabIndex={-1}
        hidden={!open}
        className={s.panel}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !event.defaultPrevented) {
            event.stopPropagation();
            onOpenChange(false);
          }
        }}
      >
        <div className={s.head}>
          <h2 id={titleId} className={s.title}>
            {title}
          </h2>
          <button
            type="button"
            className={s.close}
            aria-label="Close chat"
            onClick={() => onOpenChange(false)}
          >
            <Cross2Icon aria-hidden="true" />
          </button>
        </div>
        <div className={s.body}>{children}</div>
      </div>
      <button
        ref={bubble}
        type="button"
        className={s.bubble}
        aria-label={count ? `${label}, ${count} unread` : label}
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        {open ? <Cross2Icon aria-hidden="true" /> : <ChatBubbleIcon aria-hidden="true" />}
        {count > 0 && !open && (
          <span className={s.badge} aria-hidden="true">
            {count}
          </span>
        )}
      </button>
    </div>
  );
}
