'use client';
import type { ComponentProps, ReactNode } from 'react';
import type { MessageData } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { FollowUps } from '../follow-ups/follow-ups.js';
import type { FollowUp } from '../follow-ups/follow-ups.js';
import { Kbd } from '../kbd/kbd.js';
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
  /**
   * Where a multi-step answer stands, as your server reports it: "Writing 2 of 3 · 142 → 46".
   * Shown while streaming; the bar is the step fraction, not a time estimate.
   */
  progress?: ResponseProgress;
  /** With progress: a Stop action beside the line. Your server confirms when it has stopped. */
  onStop?: () => void;
  /** Short next steps offered once the response is complete. */
  followUps?: readonly FollowUp[];
  onFollowUp?: (item: FollowUp) => void;
}
export interface ResponseProgress {
  /** What the step does, in one word: "Writing", "Checking". */
  label: string;
  step: number;
  of: number;
  /** A measured before and after, such as word counts, formatted by your app. */
  from?: string;
  to?: string;
}
export function StreamingResponse({
  variant = 'cursor',
  text,
  state,
  error,
  renderContent,
  showStatus = true,
  progress,
  onStop,
  followUps,
  onFollowUp,
  className = '',
  ...props
}: StreamingResponseProps) {
  const fraction =
    progress && progress.of > 0 ? Math.min(1, Math.max(0, progress.step / progress.of)) : 0;
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
            <span className={r.cursor} aria-hidden="true" />
          )}
        </>
      ) : (
        <p className={s.prose}>
          {text || (state === 'streaming' ? 'Preparing a response…' : 'No response content.')}
          {state === 'streaming' && variant === 'cursor' && (
            <span className={r.cursor} aria-hidden="true" />
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
      {progress && state === 'streaming' && (
        <div className={r.progress} data-part="response-progress">
          <span className={r.progressText}>
            {progress.label} <span className={r.numeric}>{progress.step}</span> of{' '}
            <span className={r.numeric}>{progress.of}</span>
          </span>
          <span className={r.progressBar} aria-hidden="true">
            <span style={{ inlineSize: `${fraction * 100}%` }} />
          </span>
          {progress.from !== undefined && progress.to !== undefined && (
            <span className={r.numeric}>
              {progress.from} → {progress.to}
            </span>
          )}
          {onStop && (
            <Button size="sm" variant="ghost" className={r.stop} onClick={onStop}>
              Stop <Kbd size="sm">Esc</Kbd>
            </Button>
          )}
        </div>
      )}
      {showStatus && <ResponseStatus state={state} variant={variant} error={error} />}
      {followUps && onFollowUp && state === 'complete' && (
        <FollowUps className={r.followUps} items={followUps} onSelect={onFollowUp} />
      )}
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
      <span
        role="status"
        className={`${state === 'complete' || (state === 'streaming' && variant === 'cursor') ? s.srOnly : s.muted} ${r.status}`}
      >
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
