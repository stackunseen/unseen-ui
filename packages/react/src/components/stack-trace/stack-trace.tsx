'use client';
import { useState } from 'react';
import { CopyIcon } from '@radix-ui/react-icons';
import { useCopy } from '../../shared/copy.js';
import type { CopyWords } from '../../shared/copy.js';
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
  /** Replaces the built-in wording, for example to translate it. */
  labels?: Partial<StackTraceLabels>;
  className?: string;
}
export interface StackTraceLabels extends CopyWords {
  showInternal: (count: number) => string;
  hideInternal: (count: number) => string;
  copy: string;
  frames: string;
  unknownLocation: string;
}
const defaultLabels: StackTraceLabels = {
  showInternal: (count) => `Show ${count} internal`,
  hideInternal: (count) => `Hide ${count} internal`,
  copy: 'Copy stack trace',
  frames: 'Stack frames',
  unknownLocation: 'unknown location',
  copied: 'Copied',
  copyFailed: 'Copy unavailable',
};

const location = (frame: StackFrame) =>
  [frame.file, frame.line, frame.column].filter((part) => part !== undefined).join(':');

/** A readable error with its stack. Internal frames collapse by default. */
export function StackTrace({
  name,
  message,
  frames,
  onOpenFrame,
  headingLevel = 3,
  labels,
  className = '',
}: StackTraceProps) {
  const words = { ...defaultLabels, ...labels };
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
              {showInternal ? words.hideInternal(internal) : words.showInternal(internal)}
            </button>
          )}
          <button
            type="button"
            className={s.iconButton}
            aria-label={words.copy}
            onClick={() => void copy(text, 'trace')}
          >
            <CopyIcon aria-hidden="true" />
          </button>
          <span role="status" className={copyMessage('trace') ? s.meta : s.srOnly}>
            {copyMessage('trace', words)}
          </span>
        </div>
      </div>
      <p className={s.body}>{message}</p>
      <ol className={s.list} aria-label={words.frames}>
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
              <span className={`${s.meta} ${s.mono}`}>
                {location(frame) || words.unknownLocation}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
