'use client';
import type { ComponentProps } from 'react';
import type { AttachmentAccess, AttachmentState } from '@stackunseen/ui-core/uploads';
import { Attachment } from './attachment.js';
import type { AttachmentPreviewSource } from './attachment.js';
import s from '../../shared/styles/styles.module.css';
import a from './attachment.module.css';

const states = new Set<AttachmentState>([
  'selected',
  'uploading',
  'ready',
  'failed',
  'removing',
  'outcome-unknown',
  'cancelled',
  'removed',
]);
/** A composer stays readable; further files remain with the host. */
const LIMIT = 20;

export interface AttachmentTrayItem {
  id: string;
  name: string;
  state: AttachmentState;
  mediaType?: string;
  sizeBytes?: number;
  /** Measured bytes from the upload. Omit it when the amount received is unknown. */
  progress?: { loaded: number; total: number };
  detail?: string;
  access?: AttachmentAccess;
  preview?: AttachmentPreviewSource;
}
export interface AttachmentTrayProps extends Omit<ComponentProps<'div'>, 'children'> {
  items: readonly AttachmentTrayItem[];
  /** Asks the host to remove this file. The row stays until the host drops it. */
  onRemove?: (id: string) => void;
  /** Asks the host to retry a failed upload. */
  onRetry?: (id: string) => void;
  /** Asks the host to open the original. The tray never downloads a file. */
  onOpen?: (id: string) => void;
  /** Names the list. "Attachments" by default. */
  label?: string;
}

function usable(item: AttachmentTrayItem) {
  return (
    !!item &&
    typeof item.id === 'string' &&
    item.id.trim().length > 0 &&
    item.id.length <= 200 &&
    typeof item.name === 'string' &&
    states.has(item.state)
  );
}

/**
 * The files sitting in a composer: one compact row each, with measured progress, retry and
 * remove. The host owns the list. An empty list renders nothing, so the composer stays clear.
 */
export function AttachmentTray({
  items,
  onRemove,
  onRetry,
  onOpen,
  label = 'Attachments',
  className = '',
  ...props
}: AttachmentTrayProps) {
  const valid = (Array.isArray(items) ? items : []).filter(usable);
  const shown = valid.slice(0, LIMIT);
  if (!shown.length) return null;
  const heading = label.trim().slice(0, 80) || 'Attachments';
  return (
    <div {...props} className={`${a.tray} ${className}`} data-part="attachment-tray">
      <ul aria-label={`${heading}, ${shown.length} of ${valid.length}`}>
        {shown.map((item, index) => (
          <li key={`${index}:${item.id}`}>
            <Attachment
              variant="compact"
              name={item.name}
              state={item.state}
              mediaType={item.mediaType}
              sizeBytes={item.sizeBytes}
              progress={item.progress}
              detail={item.detail}
              access={item.access}
              preview={item.preview}
              onRemove={onRemove ? () => onRemove(item.id) : undefined}
              onRetry={onRetry ? () => onRetry(item.id) : undefined}
              onOpen={onOpen ? () => onOpen(item.id) : undefined}
            >
              {item.preview ? <Attachment.Preview /> : null}
              <Attachment.Info />
              <Attachment.Actions />
              <Attachment.Progress />
            </Attachment>
          </li>
        ))}
      </ul>
      {valid.length > LIMIT && (
        <p className={s.muted}>
          Showing {LIMIT} of {valid.length} files.
        </p>
      )}
    </div>
  );
}
