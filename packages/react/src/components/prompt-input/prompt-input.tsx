'use client';
import { useLocale } from '../../providers/locale/locale.js';
import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import type { ComponentProps, ReactNode, Ref } from 'react';
import type { TextRange } from '@stackunseen/ui-core/editing';
import { validTextRange } from '@stackunseen/ui-core/editing';
import { Button } from '../button/button.js';
import { IconButton } from '../icon-button/icon-button.js';
import { Kbd } from '../kbd/kbd.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import own from './prompt-input.module.css';
import a from '../attachment/attachment.module.css';
import type { CommandOption } from '../../shared/command-picker/command-picker.js';
import { useComposerSuggestions } from './composer-suggestions.js';

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
  /**
   * A line shown under the box, such as a notice. Without one, "Shift + Enter for a new line" is
   * still read to screen readers but not shown, as in ChatGPT.
   */
  hint?: string;
  /** Composition slots; uploads, validation and authoritative state remain with the host. */
  attachments?: ReactNode;
  toolbar?: ReactNode;
  submitDisabled?: boolean;
  submitDisabledReason?: string;
  /** Opt in for a host-validated attachment-only message. */
  allowEmptySubmit?: boolean;
  /** The host can focus/measure the textarea without querying the DOM. */
  textareaRef?: Ref<HTMLTextAreaElement>;
  /** UTF-16 selection against value, with an exclusive end. Invalid ranges are ignored. */
  selection?: TextRange;
  onSelectionChange?: (selection: TextRange) => void;
  /**
   * Offered when the message starts with "/". Choosing one removes the typed "/word" and calls
   * onCommand with the remaining message, for actions such as turning on web search.
   */
  commands?: readonly CommandOption[];
  onCommand?: (command: CommandOption, value: string) => void;
  /**
   * Offered after "@" (at the start or after a space). Choosing one replaces "@word" with
   * "@label " and calls onMention. Filter on your side with onMentionQueryChange for large sets.
   */
  mentions?: readonly CommandOption[];
  onMention?: (item: CommandOption) => void;
  /** The text after "@" while the mention list is open, or null when it closes. */
  onMentionQueryChange?: (query: string | null) => void;
  /**
   * A character limit shown as "86 / 500" under the box; sending stops past it. The hard
   * ceiling of 20,000 characters still applies.
   */
  limit?: number;
  /**
   * Placeholders the message can carry, such as the selected text or a saved voice. Each is
   * offered as a chip; choosing one inserts "{{id}}" at the caret, and chips already in the
   * text show as in use. Your app substitutes the values when it sends.
   */
  variables?: readonly PromptVariable[];
  onInsertVariable?: (variable: PromptVariable) => void;
  /** Extra actions beside the variables, such as an "Enhance prompt" button. */
  assist?: ReactNode;
}
export interface PromptVariable {
  id: string;
  label: string;
  /** Shown as the chip's title. */
  description?: string;
}
const HARD_LIMIT = 20_000;
const token = (variable: PromptVariable) => `{{${variable.id}}}`;

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
  hint,
  attachments,
  toolbar,
  submitDisabled = false,
  submitDisabledReason,
  allowEmptySubmit = false,
  textareaRef,
  selection,
  onSelectionChange,
  commands,
  onCommand,
  mentions,
  onMention,
  onMentionQueryChange,
  limit,
  variables,
  onInsertVariable,
  assist,
  className = '',
  ...props
}: PromptInputProps) {
  const locale = useLocale();
  const ceiling =
    limit !== undefined && Number.isFinite(limit) && limit > 0
      ? Math.min(HARD_LIMIT, Math.floor(limit))
      : HARD_LIMIT;
  const id = useId();
  const composing = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  // Grow with the text, as chat composers do, up to the stylesheet's max-height; then it scrolls.
  useLayoutEffect(() => {
    const area = input.current;
    if (!area) return;
    area.style.height = 'auto';
    area.style.height = `${area.scrollHeight + 2}px`;
  }, [value]);
  const suggestions = useComposerSuggestions({
    id,
    value,
    onValueChange,
    input,
    commands,
    onCommand,
    mentions,
    onMention,
    onMentionQueryChange,
  });
  useEffect(() => {
    if (selection && validTextRange(selection, value))
      input.current?.setSelectionRange(selection.from, selection.to);
  }, [selection, value]);
  const unavailableReason = disabled
    ? disabledReason || 'Messaging is unavailable.'
    : submitDisabled
      ? submitDisabledReason || 'Sending is unavailable. Review the current request.'
      : value.length > ceiling
        ? `Message exceeds ${ceiling.toLocaleString(locale)} characters. Shorten it before sending.`
        : undefined;
  const ready =
    !disabled &&
    !busy &&
    !submitDisabled &&
    (allowEmptySubmit || value.trim().length > 0) &&
    value.length <= ceiling;
  function submit() {
    if (ready) onSubmit(value.trim());
  }
  function insertVariable(variable: PromptVariable) {
    const area = input.current;
    // An unfocused textarea reports no caret; then the controlled selection or the end applies.
    const focused =
      area !== null && typeof document !== 'undefined' && document.activeElement === area;
    const fallback = selection && validTextRange(selection, value) ? selection : undefined;
    const from = focused ? area.selectionStart : (fallback?.from ?? value.length);
    const to = focused ? area.selectionEnd : (fallback?.to ?? value.length);
    const before = value.slice(0, from);
    const after = value.slice(to);
    const text = token(variable);
    const pad = before.length && !/\s$/.test(before) ? ' ' : '';
    const next = `${before}${pad}${text}${after.length && !/^\s/.test(after) ? ' ' : ''}${after}`;
    const caret = before.length + pad.length + text.length;
    onValueChange(next);
    onInsertVariable?.(variable);
    onSelectionChange?.({ from: caret, to: caret });
    requestAnimationFrame(() => {
      area?.focus();
      area?.setSelectionRange(caret, caret);
    });
  }
  const meta =
    (variables && variables.length > 0) || assist || limit !== undefined ? (
      <div className={own.composerMeta} data-part="composer-meta">
        {variables && variables.length > 0 && (
          <div role="group" aria-label="Insert variable" className={own.variables}>
            {variables.map((variable) => {
              const used = value.includes(token(variable));
              return (
                <Button
                  key={variable.id}
                  size="sm"
                  variant={used ? 'secondary' : 'outline'}
                  disabled={disabled}
                  title={variable.description}
                  data-in-use={used || undefined}
                  className={own.variable}
                  onClick={() => insertVariable(variable)}
                >
                  {variable.label}
                  {used && <span className={s.srOnly}> (in the message)</span>}
                </Button>
              );
            })}
          </div>
        )}
        {assist && <div className={own.assist}>{assist}</div>}
        {limit !== undefined && (
          <span
            className={own.count}
            data-over={value.length > ceiling || undefined}
            aria-hidden="true"
          >
            {value.length.toLocaleString(locale)} / {ceiling.toLocaleString(locale)}
          </span>
        )}
      </div>
    ) : null;
  return (
    <form
      {...props}
      className={`${own.composer} ${className}`}
      data-variant={variant}
      data-has-attachments={!!attachments}
      data-has-toolbar={!!toolbar}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {suggestions.list}
      <span className={s.srOnly} aria-live="polite">
        {suggestions.announcement}
      </span>
      {attachments && <div className={a.composerAttachments}>{attachments}</div>}
      <label htmlFor={id} className={s.srOnly}>
        Message
      </label>
      <textarea
        ref={(element) => {
          input.current = element;
          if (typeof textareaRef === 'function') return textareaRef(element);
          if (textareaRef) textareaRef.current = element;
        }}
        id={id}
        value={value}
        disabled={disabled}
        maxLength={HARD_LIMIT}
        placeholder={placeholder}
        rows={variant === 'inline' ? 1 : variant === 'compact' ? 2 : 3}
        aria-describedby={`${id}-help`}
        {...suggestions.textareaProps}
        onChange={(e) => {
          const next = e.currentTarget.value;
          const range = { from: e.currentTarget.selectionStart, to: e.currentTarget.selectionEnd };
          onValueChange(next);
          if (validTextRange(range, next)) onSelectionChange?.(range);
          suggestions.read();
        }}
        onKeyUp={(e) => {
          // Arrow keys and Home/End move the caret into or out of a "/" or "@" word.
          if (!['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(e.key))
            suggestions.read();
        }}
        onClick={() => suggestions.read()}
        onSelect={(e) => {
          const range = { from: e.currentTarget.selectionStart, to: e.currentTarget.selectionEnd };
          if (validTextRange(range, value)) onSelectionChange?.(range);
        }}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
        }}
        onKeyDown={(e) => {
          if (suggestions.onKeyDown(e)) return;
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
      {meta}
      <div className={own.composerFooter}>
        <div className={own.composerControls} data-part="composer-controls">
          {toolbar && <div className={a.composerToolbar}>{toolbar}</div>}
          <div className={own.composerSubmit} data-part="composer-submit">
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
          className={!unavailableReason && (variant === 'inline' || !hint) ? s.srOnly : s.muted}
          id={`${id}-help`}
          data-hint={unavailableReason ? undefined : ''}
        >
          {unavailableReason ??
            hint ??
            (variant === 'inline' ? (
              'Shift + Enter for a new line'
            ) : (
              <>
                <Kbd size="sm">Shift</Kbd> + <Kbd size="sm">Enter</Kbd> for a new line
              </>
            ))}
        </span>
      </div>
    </form>
  );
}
