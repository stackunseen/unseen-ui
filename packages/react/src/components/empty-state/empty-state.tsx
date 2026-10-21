'use client';
import type { ComponentProps, ReactNode } from 'react';
import s from '../../shared/styles/feedback.module.css';

export interface EmptyStateProps extends Omit<ComponentProps<'div'>, 'title'> {
  align?: 'start' | 'center';
  /** Shorthand for the common case; compose the parts as children for anything else. */
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  /** Heading level for `title`; match the surrounding document. */
  titleAs?: EmptyStateTitleProps['as'];
}
/** Composable absence/recovery content; the host owns its reason and actions. */
export function EmptyState({
  align = 'center',
  className = '',
  title,
  description,
  icon,
  actions,
  titleAs,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div {...props} className={`${s.emptyState} ${className}`} data-align={align}>
      {icon && <EmptyStateIcon>{icon}</EmptyStateIcon>}
      {title && <EmptyStateTitle as={titleAs}>{title}</EmptyStateTitle>}
      {description && <EmptyStateDescription>{description}</EmptyStateDescription>}
      {children}
      {actions && <EmptyStateActions>{actions}</EmptyStateActions>}
    </div>
  );
}
export function EmptyStateIcon({ className = '', ...props }: ComponentProps<'div'>) {
  return <div {...props} aria-hidden="true" className={`${s.emptyIcon} ${className}`} />;
}
export interface EmptyStateTitleProps extends ComponentProps<'h3'> {
  /** Match the surrounding document hierarchy. */
  as?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}
export function EmptyStateTitle({
  as: Tag = 'h3',
  className = '',
  ...props
}: EmptyStateTitleProps) {
  return <Tag {...props} className={`${s.title} ${className}`} />;
}
export function EmptyStateDescription({ className = '', ...props }: ComponentProps<'div'>) {
  return <div {...props} className={`${s.emptyDescription} ${className}`} />;
}
export function EmptyStateActions({ className = '', ...props }: ComponentProps<'div'>) {
  return <div {...props} className={`${s.actions} ${className}`} />;
}
