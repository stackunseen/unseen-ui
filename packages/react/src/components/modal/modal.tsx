'use client';
import type { CSSProperties, ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ThemeSurface } from '../../providers/theme/theme-provider.js';
import { IconButton } from '../icon-button/icon-button.js';
import s from '../../shared/styles/styles.module.css';
import styles from './modal.module.css';

export function Modal({
  layout = 'dialog',
  open,
  onOpenChange,
  title,
  description,
  trigger,
  header,
  footer,
  className = '',
  style,
  children,
}: {
  layout?: 'dialog' | 'sheet' | 'fullscreen';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  trigger: ReactNode;
  /** Replaces the visible heading; title still supplies the accessible dialog name. */
  header?: ReactNode;
  /** Host-owned actions, kept outside the scrolling body. */
  footer?: ReactNode;
  /** Applied to the dialog surface, including sheet and fullscreen layouts. */
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <ThemeSurface>
          <Dialog.Overlay className={s.overlay} />
          <Dialog.Content
            className={`${s.dialog} ${className}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              maxWidth: '100vw',
              overflow: 'hidden',
              ...style,
            }}
            data-layout={layout}
            data-slot="modal"
          >
            <div className={s.row} data-slot="modal-header">
              <div className={s.grow}>
                {header === undefined ? (
                  <Dialog.Title className={s.title} style={{ margin: 0 }}>
                    {title}
                  </Dialog.Title>
                ) : (
                  <>
                    <Dialog.Title asChild>
                      <span className={s.srOnly}>{title}</span>
                    </Dialog.Title>
                    {header}
                  </>
                )}
                <Dialog.Description className={s.muted}>{description}</Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <IconButton icon="close" label="Close panel" />
              </Dialog.Close>
            </div>
            <div
              className={`${s.grow} ${styles.body}`}
              style={{ minHeight: 0, overflow: 'auto', padding: 4 }}
              data-slot="modal-body"
              role="group"
              aria-label={`${title} content`}
              tabIndex={0}
            >
              {children}
            </div>
            {footer !== undefined && footer !== null && (
              <div className={`${s.actions} ${s.trailingActions}`} data-slot="modal-footer">
                {footer}
              </div>
            )}
          </Dialog.Content>
        </ThemeSurface>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
