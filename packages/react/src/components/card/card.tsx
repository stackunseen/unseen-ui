import type { ComponentProps, ReactNode } from 'react';
import { AIIcon } from '../../providers/icons/icons.js';
import { Anchor } from '../../shared/link.js';
import s from '../../shared/styles/surfaces.module.css';

export interface CardProps extends ComponentProps<'section'> {
  /**
   * Makes the whole card one link, for resources and related pages. It renders the
   * LinkProvider's router link, else a native anchor; headings inside stay headings.
   */
  href?: string;
  /** With href: opens in a new tab with rel="noreferrer" and says so to assistive technology. */
  external?: boolean;
}
export interface CardHeaderProps extends ComponentProps<'div'> {
  /** Buttons or links beside the title and description; they wrap below them in narrow cards. */
  actions?: ReactNode;
  /** Names the actions group. */
  actionsLabel?: string;
}
export interface CardTitleProps extends ComponentProps<'h3'> {
  /** Match the containing page hierarchy. */
  as?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}
export type CardDescriptionProps = ComponentProps<'p'>;
export type CardContentProps = ComponentProps<'div'>;
export type CardFooterProps = ComponentProps<'div'>;

/** An ordinary section, or one link with href. Supply aria-labelledby for a named region. */
function CardRoot({ href, external = false, className = '', children, ...props }: CardProps) {
  if (href === undefined)
    return (
      <section {...props} className={`${s.card} ${className}`}>
        {children}
      </section>
    );
  const anchorProps = props as Omit<ComponentProps<'a'>, 'href'>;
  return (
    <Anchor
      {...anchorProps}
      href={href}
      target={anchorProps.target ?? (external ? '_blank' : undefined)}
      rel={anchorProps.rel ?? (external ? 'noreferrer' : undefined)}
      data-part="card"
      data-link=""
      className={`${s.card} ${s.link} ${className}`}
    >
      {children}
      {external && (
        <>
          <span className={s.external} aria-hidden="true">
            <AIIcon name="external" size={14} />
          </span>
          <span className={s.srOnly}> (opens in a new tab)</span>
        </>
      )}
    </Anchor>
  );
}
export function CardHeader({
  actions,
  actionsLabel = 'Card actions',
  className = '',
  children,
  ...props
}: CardHeaderProps) {
  if (actions === undefined || actions === null || actions === false)
    return (
      <div {...props} className={`${s.header} ${className}`}>
        {children}
      </div>
    );
  return (
    <div {...props} className={`${s.headerWithActions} ${className}`}>
      <div className={s.header}>{children}</div>
      <div role="group" aria-label={actionsLabel} className={s.actions}>
        {actions}
      </div>
    </div>
  );
}
export function CardTitle({ as: Heading = 'h3', className = '', ...props }: CardTitleProps) {
  return <Heading {...props} className={`${s.title} ${className}`} />;
}
export function CardDescription({ className = '', ...props }: CardDescriptionProps) {
  return <p {...props} className={`${s.description} ${className}`} />;
}
export function CardContent({ className = '', ...props }: CardContentProps) {
  return <div {...props} className={`${s.content} ${className}`} />;
}
export function CardFooter({ className = '', ...props }: CardFooterProps) {
  return <div {...props} className={`${s.footer} ${className}`} />;
}

export const Card = Object.assign(CardRoot, {
  Root: CardRoot,
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Content: CardContent,
  Footer: CardFooter,
});
