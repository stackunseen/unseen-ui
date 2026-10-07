'use client';
import { useState } from 'react';
import { CopyIcon } from '@radix-ui/react-icons';
import { useCopy } from '../../shared/copy.js';
import s from '../../shared/styles/devtools.module.css';

export interface StackFrame {
  id: string;
  fn?: string;
  file?: string;
  line?: number;
  column?: number;
  /** Library or runtime frames, hidden by default. */
  internal?: boolean;
}
export interface StackTraceProps {
  name: string;
  message: string;
  frames: readonly StackFrame[];
  /** Opens a frame's source in the host's editor. */
  onOpenFrame?: (frame: StackFrame) => void;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

const location = (frame: StackFrame) =>
  [frame.file, frame.line, frame.column].filter((part) => part !== undefined).join(':');

/** A readable error with its stack. Internal frames collapse by default. */
export function StackTrace({
  name,
  message,
  frames,
  onOpenFrame,
  headingLevel = 3,
  className = '',
}: StackTraceProps) {
  const Heading = `h${headingLevel}` as const;
  const [showInternal, setShowInternal] = useState(false);
  const { copy, message: copyMessage } = useCopy();
  const internal = frames.filter((frame) => frame.internal).length;
  const shown = showInternal ? frames : frames.filter((frame) => !frame.internal);
  const text = `${name}: ${message}\n${frames
    .map((frame) => `    at ${frame.fn ?? '<anonymous>'} (${location(frame)})`)
    .join('\n')}`;
  return (
    <section className={`${s.root} ${className}`} data-part="stack-trace">
      <div className={s.header}>
        <Heading className={`${s.title} ${s.error}`}>
          <span className={s.mono}>{name}</span>
        </Heading>
        <div className={s.actions}>
          {internal > 0 && (
            <button
              type="button"
              className={s.iconButton}
              aria-pressed={showInternal}
              onClick={() => setShowInternal(!showInternal)}
            >
              {showInternal ? 'Hide' : 'Show'} {internal} internal
            </button>
          )}
          <button
            type="button"
            className={s.iconButton}
            aria-label="Copy stack trace"
            onClick={() => void copy(text, 'trace')}
          >
            <CopyIcon aria-hidden="true" />
          </button>
          <span role="status" className={copyMessage('trace') ? s.meta : s.srOnly}>
            {copyMessage('trace')}
          </span>
        </div>
      </div>
      <p className={s.body}>{message}</p>
      <ol className={s.list} aria-label="Stack frames">
        {shown.map((frame) => (
          <li key={frame.id} className={s.frame} data-internal={frame.internal || undefined}>
            <span className={`${s.grow} ${s.mono}`}>{frame.fn ?? '<anonymous>'}</span>
            {onOpenFrame && frame.file ? (
              <button
                type="button"
                className={`${s.iconButton} ${s.mono}`}
                onClick={() => onOpenFrame(frame)}
              >
                {location(frame)}
              </button>
            ) : (
              <span className={`${s.meta} ${s.mono}`}>{location(frame) || 'unknown location'}</span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
