'use client';
import type { ComponentProps } from 'react';
import { BookmarkIcon } from '@radix-ui/react-icons';
import { ObservationTime } from '../../shared/observation-time/observation-time.js';
import s from '../../shared/styles/assistant.module.css';

export interface CheckpointProps extends ComponentProps<'div'> {
  label?: string;
  /** Host timestamp of the checkpoint. */
  createdAt?: string;
  /** Requests a restore. The host performs and confirms it. */
  onRestore?: () => void;
  restoring?: boolean;
  className?: string;
}

/** A divider marking a restorable point in a conversation. */
export function Checkpoint({
  label = 'Checkpoint',
  createdAt,
  onRestore,
  restoring = false,
  className = '',
  ...rest
}: CheckpointProps) {
  return (
    <div
      {...rest}
      className={`${s.checkpoint} ${className}`}
      data-part="checkpoint"
      role="group"
      aria-label={label}
    >
      <span>
        <BookmarkIcon aria-hidden="true" />
        {/* One text run, so a narrow column wraps it like a sentence instead of orphaning the dot. */}
        <span>
          {label}
          {createdAt && (
            <>
              {' · '}
              <ObservationTime value={createdAt} />
            </>
          )}
        </span>
        {onRestore && (
          <button className={s.textButton} type="button" disabled={restoring} onClick={onRestore}>
            {restoring ? 'Restoring…' : 'Restore'}
          </button>
        )}
      </span>
    </div>
  );
}
