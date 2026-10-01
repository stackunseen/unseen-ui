import type { ComponentProps } from 'react';
import s from '../../shared/styles/surfaces.module.css';

export type CardProps = ComponentProps<'section'>;
export type CardHeaderProps = ComponentProps<'div'>;
export interface CardTitleProps extends ComponentProps<'h3'> {
  /** Match the containing page hierarchy. */
  as?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}
export type CardDescriptionProps = ComponentProps<'p'>;
export type CardContentProps = ComponentProps<'div'>;
export type CardFooterProps = ComponentProps<'div'>;

/** An ordinary section. Supply aria-labelledby when it should be a named region. */
function CardRoot({ className = '', ...props }: CardProps) {
  return <section {...props} className={`${s.card} ${className}`} />;
}
export function CardHeader({ className = '', ...props }: CardHeaderProps) {
  return <div {...props} className={`${s.header} ${className}`} />;
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
