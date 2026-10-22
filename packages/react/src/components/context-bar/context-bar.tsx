'use client';
import { useLayoutEffect, useRef } from 'react';
import type { ContextItem, ContextUsage } from '@stackunseen/ui-core';
import { IconButton } from '../icon-button/icon-button.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import own from './context-bar.module.css';

export function ContextBar({
  variant = 'list',
  items,
  usage,
  onRemove,
}: VariantProps<'ContextBar'> & {
  items: ContextItem[];
  usage?: ContextUsage;
  onRemove?: (id: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    focused = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (focused.current && !focused.current.isConnected && document.activeElement === document.body)
      root.current?.focus({ preventScroll: true });
  });
  const valid = usage && Number.isFinite(usage.used) && usage.used >= 0;
  const bounded =
    valid &&
    usage.limit !== undefined &&
    Number.isFinite(usage.limit) &&
    usage.limit > 0 &&
    usage.used <= usage.limit;
  return (
    <div
      ref={root}
      role="group"
      aria-label="Request context"
      tabIndex={-1}
      onFocusCapture={(event) => {
        focused.current = event.target as HTMLElement;
      }}
      className={own.contextBar}
      data-variant={variant}
    >
      <ul className={s.list + ' ' + own.list} aria-label="Context items">
        {items.map((item) => (
          <li key={item.id} className={s.item + ' ' + own.item}>
            <AIIcon name="document" />
            <div className={s.grow}>
              <strong>{item.label}</strong>
              <div className={s.muted}>
                {item.state}
                {item.reason ? ` · ${item.reason}` : ''}
              </div>
            </div>
            {onRemove && (
              <IconButton
                icon="close"
                onClick={() => onRemove(item.id)}
                label={`Remove ${item.label}`}
              />
            )}
          </li>
        ))}
      </ul>
      {valid ? (
        <div className={own.usage}>
          <div className={s.row}>
            <span className={s.muted}>
              {usage.kind === 'estimated' ? 'Estimated context' : 'Context usage'}
            </span>
            <strong>
              {usage.used.toLocaleString('en-US')}
              {bounded ? ` / ${usage.limit!.toLocaleString('en-US')}` : ''} tokens
            </strong>
          </div>
          {bounded && (
            <progress
              className={s.progress}
              value={usage.used}
              max={usage.limit}
              aria-label="Context usage"
            />
          )}
          <small className={s.muted}>
            {usage.model} · {usage.measuredAt}
          </small>
        </div>
      ) : (
        <p className={s.muted}>Context usage unknown</p>
      )}
    </div>
  );
}
