'use client';
import type { ComponentProps, ReactNode } from 'react';
import type { MessageData } from '@ai-interaction/core';
import { LoadingIndicator } from '../loading-indicator/loading-indicator.js';
import { Skeleton } from '../skeleton/skeleton.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import r from './streaming-response.module.css';

export interface StreamingResponseProps
  extends Omit<ComponentProps<'div'>, 'children'>, VariantProps<'StreamingResponse'> {
  text: string;
  state: MessageData['state'];
  error?: string;
  /** Composite messages announce status once at the message boundary. */
  showStatus?: boolean;
  /** Trusted application renderer. The base entry has no Markdown dependency. */
  renderContent?: (content: { text: string; state: MessageData['state'] }) => ReactNode;
}
export function StreamingResponse({
  variant = 'cursor',
  text,
  state,
  error,
  renderContent,
  showStatus = true,
  className = '',
  ...props
}: StreamingResponseProps) {
  return (
    <div
      {...props}
      className={`${r.root} ${className}`}
      data-part="response"
      data-variant={variant}
      data-state={state}
    >
      {state === 'streaming' && !text && variant === 'shimmer' ? (
        <div aria-hidden="true">
          <Skeleton label="Preparing a response" />
        </div>
      ) : text && renderContent ? (
        <>
          {renderContent({ text, state })}
          {state === 'streaming' && variant === 'cursor' && (
            <span className={s.cursor} aria-hidden="true" />
          )}
        </>
      ) : (
        <p className={s.prose}>
          {text || (state === 'streaming' ? 'Preparing a response…' : 'No response content.')}
          {state === 'streaming' && variant === 'cursor' && (
            <span className={s.cursor} aria-hidden="true" />
          )}
        </p>
      )}
      {showStatus && state === 'streaming' && variant !== 'cursor' && (
        <LoadingIndicator
          variant={variant === 'dots' ? 'dots' : 'bars'}
          label="Receiving response"
          size="small"
        />
      )}
      {showStatus && <ResponseStatus state={state} variant={variant} error={error} />}
    </div>
  );
}
export function ResponseStatus({
  state,
  variant = 'cursor',
  error,
}: Pick<StreamingResponseProps, 'state' | 'variant' | 'error'>) {
  return (
    <>
      <span role="status" className={`${state === 'complete' ? s.srOnly : s.muted} ${r.status}`}>
        {state === 'streaming'
          ? variant === 'cursor'
            ? 'Receiving response'
            : ''
          : state === 'interrupted'
            ? 'Response interrupted. Partial content retained.'
            : state === 'failed'
              ? 'Response failed. Received content retained.'
              : 'Response complete'}
      </span>
      {error && (
        <p role="alert" className={`${s.error} ${r.error}`}>
          {error}
        </p>
      )}
    </>
  );
}
