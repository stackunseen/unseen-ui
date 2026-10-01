'use client';
import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ThemeSurface } from '../../providers/theme/theme-provider.js';
import { IconButton } from '../icon-button/icon-button.js';
import s from '../../shared/styles/styles.module.css';

export function Modal({
  layout = 'dialog',
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children,
}: {
  layout?: 'dialog' | 'sheet' | 'fullscreen';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  trigger: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <ThemeSurface>
          <Dialog.Overlay className={s.overlay} />
          <Dialog.Content className={s.dialog} data-layout={layout}>
            <div className={s.row}>
              <Dialog.Title className={s.title}>{title}</Dialog.Title>
              <Dialog.Close asChild>
                <IconButton icon="close" label="Close panel" />
              </Dialog.Close>
            </div>
            <Dialog.Description className={s.muted}>{description}</Dialog.Description>
            {children}
          </Dialog.Content>
        </ThemeSurface>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
