'use client';
import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { Button } from '../button/button.js';
import { AIIcon } from '../../providers/icons/icons.js';
import { ThemeSurface } from '../../providers/theme/theme-provider.js';
import type { FeedbackTone } from '../../shared/feedback-types.js';
import s from '../../shared/styles/feedback.module.css';

function validDuration(duration: number | undefined) {
  return duration === Infinity ||
    (typeof duration === 'number' && Number.isFinite(duration) && duration > 0)
    ? duration
    : undefined;
}
export type ToastProviderProps = ComponentProps<typeof ToastPrimitive.Provider>;
/** One provider/viewport per notification area. Hosts own item identities and retained history. */
export function ToastProvider({
  duration = 10000,
  label = 'Notification',
  ...props
}: ToastProviderProps) {
  return (
    <ToastPrimitive.Provider
      {...props}
      duration={validDuration(duration) ?? 10000}
      label={label.trim() || 'Notification'}
    />
  );
}
export interface ToastProps extends Omit<ComponentProps<typeof ToastPrimitive.Root>, 'asChild'> {
  tone?: FeedbackTone;
}
/** Background/polite by default. A tone never asserts a successful host operation. */
export function Toast({
  tone = 'neutral',
  type = 'background',
  duration,
  className = '',
  ...props
}: ToastProps) {
  return (
    <ToastPrimitive.Root
      {...props}
      type={type}
      duration={validDuration(duration)}
      className={`${s.toast} ${className}`}
      data-tone={tone}
    />
  );
}
export function ToastTitle({
  className = '',
  ...props
}: ComponentProps<typeof ToastPrimitive.Title>) {
  return <ToastPrimitive.Title {...props} className={`${s.title} ${className}`} />;
}
export function ToastDescription({
  className = '',
  ...props
}: ComponentProps<typeof ToastPrimitive.Description>) {
  return <ToastPrimitive.Description {...props} className={`${s.description} ${className}`} />;
}
export type ToastActionProps = Omit<ComponentProps<typeof ToastPrimitive.Action>, 'asChild'>;
/** altText must describe another way to perform the action after this toast expires. */
export function ToastAction({ altText, className = '', ...props }: ToastActionProps) {
  return (
    <ToastPrimitive.Action altText={altText} asChild>
      <Button {...props} variant="outline" size="sm" className={`${s.toastAction} ${className}`} />
    </ToastPrimitive.Action>
  );
}
export interface ToastCloseProps extends Omit<
  ComponentProps<typeof ToastPrimitive.Close>,
  'asChild' | 'children' | 'aria-label'
> {
  label?: string;
}
export function ToastClose({
  label = 'Dismiss notification',
  className = '',
  ...props
}: ToastCloseProps) {
  return (
    <ToastPrimitive.Close asChild>
      <Button
        {...props}
        variant="ghost"
        size="sm"
        aria-label={label.trim() || 'Dismiss notification'}
        className={`${s.toastClose} ${className}`}
      >
        <AIIcon name="close" />
      </Button>
    </ToastPrimitive.Close>
  );
}
export interface ToastViewportProps extends Omit<
  ComponentProps<typeof ToastPrimitive.Viewport>,
  'asChild'
> {
  position?: 'bottom-end' | 'bottom-start' | 'top-end' | 'top-start';
  /** Override the body portal, e.g. for a host overlay layer. */
  container?: HTMLElement | null;
  /** Inline positioning is useful within a host-owned layer. */
  portal?: boolean;
}
/** Set dir for a locally RTL theme when the document itself is LTR. F8 moves focus here. */
export function ToastViewport({
  position = 'bottom-end',
  container,
  portal = true,
  label = 'Notifications ({hotkey})',
  className = '',
  ...props
}: ToastViewportProps) {
  const [body, setBody] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setBody(document.body);
  }, []);
  const viewport = (
    <ThemeSurface>
      <ToastPrimitive.Viewport
        {...props}
        label={label}
        data-position={position}
        className={`${s.viewport} ${className}`}
      />
    </ThemeSurface>
  );
  const target = container ?? body;
  return portal ? (target ? createPortal(viewport, target) : null) : viewport;
}
