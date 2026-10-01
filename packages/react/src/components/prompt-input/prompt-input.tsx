'use client';
import { useId, useRef } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '../button/button.js';
import { IconButton } from '../icon-button/icon-button.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import a from '../attachment/attachment.module.css';

export interface PromptInputProps
  extends Omit<ComponentProps<'form'>, 'onSubmit' | 'onChange'>, VariantProps<'PromptInput'> {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (text: string) => void;
  busy?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onCancel?: () => void;
  placeholder?: string;
  /** Composition slots; uploads, validation and authoritative state remain with the host. */
  attachments?: ReactNode;
  toolbar?: ReactNode;
  submitDisabled?: boolean;
  submitDisabledReason?: string;
  /** Opt in for a host-validated attachment-only message. */
  allowEmptySubmit?: boolean;
}

export function PromptInput({
  variant = 'standard',
  value,
  onValueChange,
  onSubmit,
  busy = false,
  disabled = false,
  disabledReason,
  onCancel,
  placeholder = 'Ask a question or describe a task…',
  attachments,
  toolbar,
  submitDisabled = false,
  submitDisabledReason,
  allowEmptySubmit = false,
  className = '',
  ...props
}: PromptInputProps) {
  const id = useId();
  const composing = useRef(false);
  const unavailableReason = disabled
    ? disabledReason || 'Messaging is unavailable.'
    : submitDisabled
      ? submitDisabledReason || 'Sending is unavailable. Review the current request.'
      : value.length > 20_000
        ? 'Message exceeds 20,000 characters. Shorten it before sending.'
        : undefined;
  const ready =
    !disabled &&
    !busy &&
    !submitDisabled &&
    (allowEmptySubmit || value.trim().length > 0) &&
    value.length <= 20_000;
  function submit() {
    if (ready) onSubmit(value.trim());
  }
  return (
    <form
      {...props}
      className={`${s.composer} ${className}`}
      data-variant={variant}
      data-has-attachments={!!attachments}
      data-has-toolbar={!!toolbar}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {attachments && <div className={a.composerAttachments}>{attachments}</div>}
      <label htmlFor={id} className={s.srOnly}>
        Message
      </label>
      <textarea
        id={id}
        value={value}
        disabled={disabled}
        maxLength={20_000}
        placeholder={placeholder}
        rows={variant === 'inline' ? 1 : variant === 'compact' ? 2 : 3}
        aria-describedby={`${id}-help`}
        onChange={(e) => onValueChange(e.target.value)}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
        }}
        onKeyDown={(e) => {
          if (
            e.key === 'Enter' &&
            !e.shiftKey &&
            !composing.current &&
            !e.nativeEvent.isComposing &&
            e.keyCode !== 229
          ) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div className={s.composerFooter}>
        <div className={s.composerControls} data-part="composer-controls">
          {toolbar && <div className={a.composerToolbar}>{toolbar}</div>}
          <div className={s.composerSubmit} data-part="composer-submit">
            {busy && onCancel ? (
              <Button size="sm" variant="outline" onClick={onCancel}>
                <AIIcon name="stop" /> Stop response
              </Button>
            ) : (
              <IconButton
                variant="primary"
                type="submit"
                disabled={!ready}
                label="Send message"
                icon="send"
              />
            )}
          </div>
        </div>
        <span
          className={variant === 'inline' && !unavailableReason ? s.srOnly : s.muted}
          id={`${id}-help`}
        >
          {unavailableReason ?? 'Shift + Enter for a new line'}
        </span>
      </div>
    </form>
  );
}
