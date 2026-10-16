'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { MessageData, Source, ToolCallData } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { Message, MessageActions } from '../message/message.js';
import { PromptInput } from '../prompt-input/prompt-input.js';
import { Suggestions } from '../suggestions/suggestions.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import type { MessageContentProps } from '../message-content/message-content.js';
import css from './chat.module.css';

export type ChatStatus = 'idle' | 'streaming' | 'complete' | 'cancelled' | 'failed';

/** The conversation as the host publishes it. The local host and a real server both fit. */
export interface ChatHostSnapshot {
  messages: readonly MessageData[];
  tools?: readonly ToolCallData[];
  status: ChatStatus;
  /** Prompts to offer right now; empty hides them. */
  suggestions?: readonly string[];
}
/** The host owns the conversation; the component subscribes and sends intents. */
export interface ChatHost {
  getSnapshot(): ChatHostSnapshot;
  subscribe(listener: () => void): () => void;
  send(text: string): unknown;
  cancel?(): void;
  retry?(): void;
}

export interface ChatBaseProps extends VariantProps<'Chat'> {
  /** Shown above the transcript; also the accessible name. */
  title?: string;
  placeholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Prompts shown before the first message when the host offers none. */
  starters?: readonly string[];
  sources?: readonly Source[];
  responseVariant?: MessageContentProps['responseVariant'];
  renderTextPart?: MessageContentProps['renderTextPart'];
  maxPromptLength?: number;
  /** Composition slots for the composer. */
  toolbar?: ReactNode;
  attachments?: ReactNode;
  className?: string;
  style?: CSSProperties;
}
export interface ChatControlledProps extends ChatBaseProps {
  host?: never;
  messages: readonly MessageData[];
  tools?: readonly ToolCallData[];
  status: ChatStatus;
  suggestions?: readonly string[];
  draft: string;
  onDraftChange: (draft: string) => void;
  onSend: (text: string) => void;
  onCancel?: () => void;
  onRetry?: () => void;
}
export interface ChatHostProps extends ChatBaseProps {
  host: ChatHost;
}
export type ChatProps = ChatControlledProps | ChatHostProps;

const idle: ChatHostSnapshot = { messages: [], status: 'idle' };
function useHostSnapshot(host: ChatHost | undefined): ChatHostSnapshot {
  return useSyncExternalStore(
    (listener) => (host ? host.subscribe(listener) : () => {}),
    () => (host ? host.getSnapshot() : idle),
    () => (host ? host.getSnapshot() : idle),
  );
}

/**
 * A complete chat surface: transcript, streaming reply, tool cards, suggestions and composer.
 * Pass a host and it wires itself, or pass the controlled props and own every value yourself.
 */
export function Chat(props: ChatProps) {
  const {
    variant = 'panel',
    title = 'Assistant',
    placeholder,
    emptyTitle = 'Start a conversation',
    emptyDescription = 'Ask a question or pick a suggestion.',
    starters = [],
    sources,
    responseVariant,
    renderTextPart,
    maxPromptLength = 4000,
    toolbar,
    attachments,
    className = '',
    style,
  } = props;
  const hostProps = 'host' in props && props.host ? props : undefined;
  const controlled = hostProps ? undefined : (props as ChatControlledProps);
  const host = hostProps?.host;
  const live = useHostSnapshot(host);
  const [localDraft, setLocalDraft] = useState('');
  const messages = controlled ? controlled.messages : live.messages;
  const tools = controlled ? controlled.tools : live.tools;
  const status = controlled ? controlled.status : live.status;
  const suggestions = controlled ? controlled.suggestions : live.suggestions;
  const draft = controlled ? controlled.draft : localDraft;
  const setDraft = controlled ? controlled.onDraftChange : setLocalDraft;
  const send = controlled ? controlled.onSend : (text: string) => host!.send(text);
  const cancel = controlled ? controlled.onCancel : host?.cancel ? () => host.cancel!() : undefined;
  const retry = controlled ? controlled.onRetry : host?.retry ? () => host.retry!() : undefined;

  const transcript = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [follow, setFollow] = useState(true);
  const busy = status === 'streaming';
  const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant');
  const lastAssistantText =
    lastAssistant && 'text' in lastAssistant && typeof lastAssistant.text === 'string'
      ? lastAssistant.text
      : (lastAssistant?.parts ?? [])
          .map((part) => (part.type === 'text' ? part.text : ''))
          .join('');

  useEffect(() => {
    const node = transcript.current;
    if (follow && node) node.scrollTop = node.scrollHeight;
  }, [messages, follow]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (busy || !trimmed || trimmed.length > maxPromptLength) return;
    send(trimmed);
    setDraft('');
    setFollow(true);
    textarea.current?.focus();
  }
  const offered =
    suggestions && suggestions.length > 0 ? suggestions : messages.length ? [] : starters;

  return (
    <section
      className={`${css.root} ${className}`}
      data-part="chat"
      data-variant={variant}
      data-status={status}
      aria-label={title}
      style={style}
    >
      {variant === 'panel' && (
        <header className={css.header}>
          <AIIcon name="assistant" />
          <h2 className={css.title}>{title}</h2>
        </header>
      )}
      <div
        ref={transcript}
        className={css.transcript}
        role="log"
        aria-label={`${title} transcript`}
        aria-live="polite"
        tabIndex={0}
        onScroll={(event) => {
          const node = event.currentTarget;
          setFollow(node.scrollHeight - node.scrollTop - node.clientHeight < 48);
        }}
      >
        {messages.length === 0 ? (
          <div className={css.empty}>
            <strong>{emptyTitle}</strong>
            <p className={css.muted}>{emptyDescription}</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <Message
              key={message.id}
              value={message}
              variant="plain"
              tools={tools}
              sources={sources}
              responseVariant={responseVariant}
              renderTextPart={renderTextPart}
              className={css.message}
            >
              {message.role === 'assistant' &&
                message.state === 'complete' &&
                index === messages.length - 1 && (
                  <MessageActions
                    variant="compact"
                    text={lastAssistantText}
                    onRetry={retry}
                    retryLabel="Regenerate"
                  />
                )}
            </Message>
          ))
        )}
        {status === 'cancelled' && (
          <p className={`${css.muted} ${css.note}`} role="status">
            Stopped. The partial reply is kept above.
          </p>
        )}
        {status === 'failed' && (
          <p className={`${css.error} ${css.note}`} role="status">
            The reply did not finish.
          </p>
        )}
        {(status === 'cancelled' || status === 'failed') && retry && (
          <div className={css.note}>
            <Button variant="outline" size="sm" onClick={() => retry()}>
              <AIIcon name="retry" />
              Retry
            </Button>
          </div>
        )}
        {offered.length > 0 && !busy && (
          <div className={css.suggestions}>
            <Suggestions items={[...offered]} mode="send" onSelect={(text) => submit(text)} />
          </div>
        )}
      </div>
      {!follow && messages.length > 0 && (
        <div className={css.jump}>
          <Button variant="ghost" size="sm" onClick={() => setFollow(true)}>
            Jump to latest
          </Button>
        </div>
      )}
      <div className={css.composer}>
        <PromptInput
          variant="compact"
          aria-label={`Message ${title}`}
          value={draft}
          onValueChange={setDraft}
          onSubmit={submit}
          busy={busy}
          onCancel={cancel}
          placeholder={placeholder}
          textareaRef={textarea}
          toolbar={toolbar}
          attachments={attachments}
          submitDisabled={draft.trim().length > maxPromptLength}
          submitDisabledReason={`Keep the message under ${maxPromptLength.toLocaleString('en-US')} characters.`}
        />
      </div>
    </section>
  );
}
