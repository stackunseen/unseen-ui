'use client';
import type { ComponentProps, ReactNode } from 'react';
import { AIIcon } from '../../providers/icons/icons.js';
import type { IconName } from '../../providers/icons/icons.js';
import type { FeedbackTone } from '../../shared/feedback-types.js';
import s from '../../shared/styles/feedback.module.css';

const icons: Record<FeedbackTone, IconName> = {
  neutral: 'info',
  info: 'info',
  success: 'check',
  warning: 'warning',
  danger: 'warning',
};
export interface AlertProps extends ComponentProps<'div'> {
  tone?: FeedbackTone;
  /** Decorative visual. null omits it. Keep the meaning in the text. */
  icon?: ReactNode;
}
/** Static by default. Use role="status" or role="alert" for relevant dynamic updates. */
export function Alert({ tone = 'info', icon, children, className = '', ...props }: AlertProps) {
  return (
    <div {...props} className={`${s.alert} ${className}`} data-tone={tone}>
      {icon !== null && (
        <span className={s.alertIcon} aria-hidden="true">
          {icon ?? <AIIcon name={icons[tone]} />}
        </span>
      )}
      <div className={s.alertContent}>{children}</div>
    </div>
  );
}
export function AlertTitle({ className = '', ...props }: ComponentProps<'div'>) {
  return <div {...props} className={`${s.title} ${className}`} />;
}
export function AlertDescription({ className = '', ...props }: ComponentProps<'div'>) {
  return <div {...props} className={`${s.description} ${className}`} />;
}
export function AlertActions({ className = '', ...props }: ComponentProps<'div'>) {
  return <div {...props} className={`${s.actions} ${className}`} />;
}
