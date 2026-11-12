'use client';
import { useMergedRef } from '../../shared/use-merged-ref.js';
import type { ComponentProps } from 'react';
import { useLayoutEffect, useRef } from 'react';
import { IconButton } from '../icon-button/icon-button.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/agent-controls.module.css';
import c from '../../shared/styles/coding.module.css';
import n from '../../shared/styles/navigation.module.css';
import { stateLabel } from '../../shared/labels.js';
export interface MemoryRecord {
  id: string;
  version: string;
  label: string;
  value: string;
  scope: string;
  state: 'available' | 'pending' | 'revoked' | 'error';
  error?: string;
}
export interface MemoryControlsProps extends VariantProps<'MemoryControls'>, ComponentProps<'div'> {
  /** A host-owned window of up to 100 entries. Replace the window to inspect later memories. */
  items: readonly MemoryRecord[];
  onRequest: (item: MemoryRecord, action: 'correct' | 'delete') => void;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}
export function MemoryControls({
  items,
  onRequest,
  variant = 'list',
  className = '',
  ref,
  onFocusCapture,
  onBlurCapture,
  ...rest
}: MemoryControlsProps) {
  const root = useRef<HTMLDivElement>(null);
  const rootRef = useMergedRef(root, ref);
  const focusedItem = useRef<string | undefined>(undefined);
  const visibleItems = items.slice(0, 100);
  useLayoutEffect(() => {
    if (focusedItem.current && !visibleItems.some((item) => item.id === focusedItem.current))
      root.current?.focus();
  });
  return (
    <div
      {...rest}
      ref={rootRef}
      className={`${s.root} ${className}`}
      data-part="memory-controls"
      data-variant={variant}
      role="group"
      aria-label="Saved memory"
      tabIndex={-1}
      onFocusCapture={(event) => {
        onFocusCapture?.(event);
        const row = (event.target as HTMLElement).closest<HTMLElement>('[data-memory-id]');
        focusedItem.current = row?.dataset.memoryId;
      }}
      onBlurCapture={(event) => {
        onBlurCapture?.(event);
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          focusedItem.current = undefined;
      }}
    >
      <strong>Saved memory</strong>
      {!items.length ? (
        <p className={s.muted}>No saved memories reported.</p>
      ) : (
        <ul className={c.list}>
          {visibleItems.map((item) => (
            <li key={item.id} className={c.test} data-memory-id={item.id}>
              <div className={s.header}>
                <strong>{item.label}</strong>
                <span className={s.tag}>{stateLabel(item.state)}</span>
                <div className={n.actions} role="group" aria-label={`Actions for ${item.label}`}>
                  <IconButton
                    icon="edit"
                    label={`Request correction for ${item.label}`}
                    disabled={item.state === 'pending' || item.state === 'revoked'}
                    onClick={() => onRequest(item, 'correct')}
                  />
                  <IconButton
                    icon="delete"
                    label={`Request deletion of ${item.label}`}
                    disabled={item.state === 'pending' || item.state === 'revoked'}
                    onClick={() => onRequest(item, 'delete')}
                  />
                </div>
              </div>
              <p className={s.muted}>
                {item.scope} · Version {item.version}
              </p>
              {item.state === 'revoked' ? (
                <p className={s.muted}>This memory is no longer accessible.</p>
              ) : (
                <p>{item.value.slice(0, 5000)}</p>
              )}
              {item.error && (
                <p className={s.error} role="alert">
                  {item.error}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {items.length > 100 && (
        <p className={s.muted}>Showing the first 100 memories. Load more to see the rest.</p>
      )}
    </div>
  );
}
