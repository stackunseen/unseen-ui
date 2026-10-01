'use client';
import { useRef, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import type { MessageData } from '@ai-interaction/core';
import { Button } from '../button/button.js';
import { IconButton } from '../icon-button/icon-button.js';
import { ThickArrowUpIcon, ThickArrowDownIcon } from '@radix-ui/react-icons';
import { AIIcon } from '../../providers/icons/icons.js';
import { MessageContent } from '../message-content/message-content.js';
import type { MessageContentProps } from '../message-content/message-content.js';
import { validTimestamp } from '@ai-interaction/core';
import m from '../message-content/message-content.module.css';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';

export interface MessageProps
  extends ComponentProps<'article'>, VariantProps<'Message'>, MessageContentProps {
  value: MessageData;
  /** Replaces only the response body; children remain after it for actions/attachments. */
  renderContent?: (message: MessageData) => ReactNode;
}

export function Message({
  variant = 'plain',
  value,
  renderContent,
  sources,
  tools,
  attachments,
  responseVariant,
  renderTextPart,
  children,
  className = '',
  ...props
}: MessageProps) {
  return (
    <article
      {...props}
      className={`${s.message} ${className}`}
      data-role={value.role}
      data-variant={variant}
      aria-label={`${value.role} message`}
    >
      <div className={s.messageAvatar} aria-hidden="true">
        <AIIcon
          name={value.role === 'assistant' ? 'assistant' : value.role === 'user' ? 'user' : 'info'}
        />
      </div>
      <div className={s.messageBody}>
        <div className={`${s.messageLabel} ${m.metadata}`}>
          <span>
            {value.role === 'assistant' ? 'Assistant' : value.role === 'user' ? 'You' : 'System'}
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
          />
        )}
        {children}
      </div>
    </article>
  );
}

export function MessageActions({
  variant = 'toolbar',
  text,
  onRetry,
  onEdit,
  onFeedback,
}: VariantProps<'MessageActions'> & {
  text: string;
  onRetry?: () => void;
  onEdit?: () => void;
  onFeedback?: (helpful: boolean) => void;
}) {
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
  return (
    <div
      role="group"
      aria-label="Message actions"
      data-part="message-actions"
      className={`${s.actions} ${s.messageActions}`}
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
          <IconButton icon="retry" label="Retry" onClick={onRetry} />
        ) : (
          <Button size="sm" variant="ghost" onClick={onRetry}>
            <AIIcon name="retry" />
            Retry
          </Button>
        ))}
      {onEdit &&
        (iconActions ? (
          <IconButton icon="edit" label="Edit" onClick={onEdit} />
        ) : (
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <AIIcon name="edit" />
            Edit
          </Button>
        ))}
      {onFeedback && (
        <>
          {iconActions ? (
            <IconButton
              icon="helpful"
              label="Helpful"
              onClick={() => {
                onFeedback(true);
                setFeedback({ text, message: 'Feedback requested.' });
              }}
            />
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onFeedback(true);
                setFeedback({ text, message: 'Feedback requested.' });
              }}
            >
              <AIIcon name="helpful" fallbackIcon={ThickArrowUpIcon} />
              Helpful
            </Button>
          )}
          {iconActions ? (
            <IconButton
              icon="unhelpful"
              label="Not helpful"
              onClick={() => {
                onFeedback(false);
                setFeedback({ text, message: 'Feedback requested.' });
              }}
            />
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onFeedback(false);
                setFeedback({ text, message: 'Feedback requested.' });
              }}
            >
              <AIIcon name="unhelpful" fallbackIcon={ThickArrowDownIcon} />
              Not helpful
            </Button>
          )}
        </>
      )}
      <span role="status" className={s.muted}>
        {feedback?.text === text ? feedback.message : ''}
      </span>
    </div>
  );
}
