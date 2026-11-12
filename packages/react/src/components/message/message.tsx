'use client';
import { messageFrom } from '@stackunseen/ui-core';
import { useRef, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import type { MessageData, MessageInput } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import {
  IconButton,
  ThumbDown,
  ThumbDownFilled,
  ThumbUp,
  ThumbUpFilled,
} from '../icon-button/icon-button.js';
import { AIIcon } from '../../providers/icons/icons.js';
import { MessageContent } from '../message-content/message-content.js';
import type { MessageContentProps } from '../message-content/message-content.js';
import { validTimestamp } from '@stackunseen/ui-core';
import m from '../message-content/message-content.module.css';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import own from './message.module.css';

export interface MessageProps
  extends ComponentProps<'article'>, VariantProps<'Message'>, Omit<MessageContentProps, 'value'> {
  /** Host data, or the short form `{ role, text }` for prototypes. */
  value: MessageData | MessageInput;
  /** Replaces only the response body; children remain after it for actions/attachments. */
  renderContent?: (message: MessageData) => ReactNode;
}

export function Message({
  variant = 'plain',
  value: input,
  renderContent,
  sources,
  tools,
  attachments,
  responseVariant,
  renderTextPart,
  renderTool,
  children,
  className = '',
  ...props
}: MessageProps) {
  const value = messageFrom(input);
  // In a group chat, someone else's message names them; yours and the assistant's read as before.
  const other = value.author && !value.author.you ? value.author.name : undefined;
  return (
    <article
      {...props}
      className={`${s.message} ${className}`}
      data-role={value.role}
      data-variant={variant}
      data-author={value.author ? (value.author.you ? 'you' : 'other') : undefined}
      aria-label={other ? `Message from ${other}` : `${value.role} message`}
    >
      <div className={s.messageAvatar} aria-hidden="true">
        <AIIcon
          name={value.role === 'assistant' ? 'assistant' : value.role === 'user' ? 'user' : 'info'}
        />
      </div>
      <div className={s.messageBody} data-part="message-body">
        <div className={`${s.messageLabel} ${m.metadata}`} data-part="message-label">
          <span>
            {other ??
              (value.role === 'assistant' ? 'Assistant' : value.role === 'user' ? 'You' : 'System')}
          </span>
          {value.createdAt && validTimestamp(value.createdAt) && (
            <time dateTime={value.createdAt}>
              {new Date(value.createdAt).toISOString().slice(0, 16).replace('T', ' ')} UTC
            </time>
          )}
        </div>
        {renderContent ? (
          renderContent(value)
        ) : (
          <MessageContent
            value={value}
            sources={sources}
            tools={tools}
            attachments={attachments}
            responseVariant={responseVariant}
            renderTextPart={renderTextPart}
            renderTool={renderTool}
          />
        )}
        {variant !== 'chat' && children}
      </div>
      {/* In a chat, actions sit under the bubble rather than inside it. */}
      {variant === 'chat' && children}
    </article>
  );
}

export function MessageActions({
  variant = 'toolbar',
  text,
  onRetry,
  onEdit,
  onFeedback,
  editAvailability,
  retryAvailability,
  retryLabel = 'Retry',
  feedbackValue,
  children,
  className = '',
}: VariantProps<'MessageActions'> & {
  text: string;
  onRetry?: () => void;
  onEdit?: () => void;
  onFeedback?: (helpful: boolean) => void;
  /** Host-owned action availability; callbacks remain intents. */
  editAvailability?: { available: boolean; reason?: string };
  retryAvailability?: { available: boolean; reason?: string };
  retryLabel?: string;
  /** The rating already recorded for this message; shows as a pressed button. */
  feedbackValue?: 'helpful' | 'unhelpful';
  /** Extra actions such as Read aloud or Share, placed after the built-in ones. */
  children?: ReactNode;
} & { className?: string }) {
  const [feedback, setFeedback] = useState<{ text: string; message: string }>();
  const currentText = useRef(text),
    copyAttempt = useRef(0);
  currentText.current = text;
  async function copy() {
    const attempt = ++copyAttempt.current;
    try {
      await navigator.clipboard.writeText(text);
      if (currentText.current === text && attempt === copyAttempt.current)
        setFeedback({ text, message: 'Copied' });
    } catch {
      if (currentText.current === text && attempt === copyAttempt.current)
        setFeedback({ text, message: 'Copy unavailable. Select and copy the text.' });
    }
  }
  const iconActions = variant !== 'vertical';
  const edit = () => {
    if (editAvailability?.available !== false) onEdit?.();
  };
  const retry = () => {
    if (retryAvailability?.available !== false) onRetry?.();
  };
  return (
    <div
      role="group"
      aria-label="Message actions"
      data-part="message-actions"
      className={`${s.actions} ${own.messageActions} ${className}`}
      data-variant={variant}
    >
      {iconActions ? (
        <IconButton
          icon="copy"
          label="Copy"
          onClick={() => {
            void copy();
          }}
        />
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            void copy();
          }}
        >
          <AIIcon name="copy" />
          Copy
        </Button>
      )}
      {onRetry &&
        (iconActions ? (
          <IconButton
            icon="retry"
            label={retryLabel}
            onClick={retry}
            disabled={retryAvailability?.available === false}
          />
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={retry}
            disabled={retryAvailability?.available === false}
          >
            <AIIcon name="retry" />
            {retryLabel}
          </Button>
        ))}
      {onEdit &&
        (iconActions ? (
          <IconButton
            icon="edit"
            label="Edit"
            onClick={edit}
            disabled={editAvailability?.available === false}
          />
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={edit}
            disabled={editAvailability?.available === false}
          >
            <AIIcon name="edit" />
            Edit
          </Button>
        ))}
      {onFeedback && (
        <>
          {iconActions ? (
            <IconButton
              icon={feedbackValue === 'helpful' ? ThumbUpFilled : 'helpful'}
              label="Helpful"
              aria-pressed={feedbackValue === 'helpful'}
              onClick={() => {
                onFeedback(true);
                setFeedback({ text, message: 'Feedback sent.' });
              }}
            />
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onFeedback(true);
                setFeedback({ text, message: 'Feedback sent.' });
              }}
            >
              <AIIcon
                name="helpful"
                fallbackIcon={feedbackValue === 'helpful' ? ThumbUpFilled : ThumbUp}
              />
              Helpful
            </Button>
          )}
          {iconActions ? (
            <IconButton
              icon={feedbackValue === 'unhelpful' ? ThumbDownFilled : 'unhelpful'}
              label="Not helpful"
              aria-pressed={feedbackValue === 'unhelpful'}
              onClick={() => {
                onFeedback(false);
                setFeedback({ text, message: 'Feedback sent.' });
              }}
            />
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onFeedback(false);
                setFeedback({ text, message: 'Feedback sent.' });
              }}
            >
              <AIIcon
                name="unhelpful"
                fallbackIcon={feedbackValue === 'unhelpful' ? ThumbDownFilled : ThumbDown}
              />
              Not helpful
            </Button>
          )}
        </>
      )}
      {children}
      <span role="status" className={s.muted}>
        {feedback?.text === text ? feedback.message : ''}
      </span>
      {onEdit && editAvailability?.available === false && (
        <span className={s.muted}>{editAvailability.reason || 'Editing is unavailable.'}</span>
      )}
      {onRetry && retryAvailability?.available === false && (
        <span className={s.muted}>{retryAvailability.reason || 'Retry is unavailable.'}</span>
      )}
    </div>
  );
}
