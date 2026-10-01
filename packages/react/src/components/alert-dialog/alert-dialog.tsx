'use client';
import { createContext, useContext } from 'react';
import type { ComponentProps, MouseEvent, ReactNode } from 'react';
import * as Primitive from '@radix-ui/react-alert-dialog';
import { Button } from '../button/button.js';
import type { ButtonProps } from '../button/button.js';
import { ThemeSurface } from '../../providers/theme/theme-provider.js';
import controls from '../../shared/styles/styles.module.css';
import s from '../../shared/styles/overlays.module.css';
import { OverlayDirection, useOverlayDirection } from '../../shared/overlay-direction.js';

const BusyContext = createContext(false);
export interface AlertDialogProps extends ComponentProps<typeof Primitive.Root> {
  /** Set for locally scoped RTL layouts so the portal and trigger share direction. */
  dir?: 'ltr' | 'rtl';
  /** Host-owned submission state. Disables repeat action intents, not cancellation. */
  busy?: boolean;
}
export type AlertDialogTriggerProps = ComponentProps<typeof Primitive.Trigger>;
export interface AlertDialogContentProps extends Omit<
  ComponentProps<typeof Primitive.Content>,
  'asChild'
> {
  container?: ComponentProps<typeof Primitive.Portal>['container'];
  /** Host-owned failure feedback; never inferred from a clicked action. */
  error?: ReactNode;
}
export interface AlertDialogActionProps extends Omit<ButtonProps, 'onClick' | 'type'> {
  /** Emits intent only. The host closes a controlled dialog after acknowledging the result. */
  onAction: (event: MouseEvent<HTMLButtonElement>) => void;
}
export type AlertDialogCancelProps = Omit<ButtonProps, 'type'>;

function AlertDialogRoot({ busy = false, dir, children, ...props }: AlertDialogProps) {
  const direction = useOverlayDirection(dir) as 'ltr' | 'rtl' | undefined;
  return (
    <OverlayDirection.Provider value={direction}>
      <BusyContext.Provider value={busy}>
        <Primitive.Root {...props}>{children}</Primitive.Root>
      </BusyContext.Provider>
    </OverlayDirection.Provider>
  );
}

export function AlertDialogTrigger({
  asChild,
  dir,
  className = '',
  ...props
}: AlertDialogTriggerProps) {
  const direction = useOverlayDirection(dir);
  return (
    <Primitive.Trigger
      {...props}
      dir={direction}
      asChild={asChild}
      className={`${asChild ? '' : controls.button} ${className}`}
      data-variant="outline"
    />
  );
}

export function AlertDialogContent({
  container,
  forceMount,
  children,
  error,
  className = '',
  dir,
  ...props
}: AlertDialogContentProps) {
  const busy = useContext(BusyContext);
  const direction = useOverlayDirection(dir);
  return (
    <Primitive.Portal container={container} forceMount={forceMount}>
      <ThemeSurface>
        <Primitive.Overlay className={s.backdrop} forceMount={forceMount} />
        <Primitive.Content
          {...props}
          dir={direction}
          forceMount={forceMount}
          aria-busy={busy || undefined}
          className={`${s.surface} ${s.alertDialog} ${className}`}
        >
          {children}
          {error !== undefined && error !== null && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}
        </Primitive.Content>
      </ThemeSurface>
    </Primitive.Portal>
  );
}

export function AlertDialogTitle({
  className = '',
  ...props
}: ComponentProps<typeof Primitive.Title>) {
  return <Primitive.Title {...props} className={`${s.title} ${className}`} />;
}

export function AlertDialogDescription({
  className = '',
  ...props
}: ComponentProps<typeof Primitive.Description>) {
  return <Primitive.Description {...props} className={`${s.description} ${className}`} />;
}

export function AlertDialogActions({ className = '', ...props }: ComponentProps<'div'>) {
  return <div {...props} className={`${s.actions} ${className}`} />;
}

export function AlertDialogCancel({ variant = 'outline', ...props }: AlertDialogCancelProps) {
  return (
    <Primitive.Cancel asChild>
      <Button {...props} type="button" variant={variant} />
    </Primitive.Cancel>
  );
}

export function AlertDialogAction({
  onAction,
  disabled,
  variant = 'danger',
  ...props
}: AlertDialogActionProps) {
  const busy = useContext(BusyContext);
  return (
    <Primitive.Action asChild>
      <Button
        {...props}
        type="button"
        variant={variant}
        disabled={disabled || busy}
        onClick={(event) => {
          // Radix normally closes Action immediately. A click is not host acknowledgement.
          event.preventDefault();
          if (!disabled && !busy) onAction(event);
        }}
      />
    </Primitive.Action>
  );
}

export const AlertDialog = Object.assign(AlertDialogRoot, {
  Root: AlertDialogRoot,
  Trigger: AlertDialogTrigger,
  Content: AlertDialogContent,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
  Actions: AlertDialogActions,
  Cancel: AlertDialogCancel,
  Action: AlertDialogAction,
});
