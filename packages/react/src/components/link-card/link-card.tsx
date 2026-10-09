import type { ComponentProps, ReactNode } from 'react';
import { AIIcon } from '../../providers/icons/icons.js';
import { Anchor } from '../../shared/link.js';
import type { VariantProps } from '../../shared/variants.js';
import d from '../../shared/styles/display.module.css';

export interface LinkCardProps
  extends Omit<ComponentProps<'a'>, 'title'>, VariantProps<'LinkCard'> {
  href: string;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  /** Decorative icon or image before the text. */
  icon?: ReactNode;
  /** Opens in a new tab with rel="noreferrer" and marks the title with an external icon. */
  external?: boolean;
}

/** A plain link presented as a card or row. The whole surface is one anchor: the LinkProvider's router link, else native. */
export function LinkCard({
  variant = 'card',
  title,
  description,
  meta,
  icon,
  external = false,
  className = '',
  target,
  rel,
  ...props
}: LinkCardProps) {
  return (
    <Anchor
      {...props}
      target={target ?? (external ? '_blank' : undefined)}
      rel={rel ?? (external ? 'noreferrer' : undefined)}
      data-variant={variant}
      data-part="link-card"
      className={`${d.linkCard} ${className}`}
    >
      {icon && (
        <span className={d.linkCardIcon} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={d.linkCardBody}>
        <span className={d.linkCardTitle}>
          {title}
          {external && <AIIcon name="external" size={14} />}
        </span>
        {description && <span className={d.linkCardDescription}>{description}</span>}
        {meta && <span className={d.linkCardMeta}>{meta}</span>}
      </span>
    </Anchor>
  );
}
