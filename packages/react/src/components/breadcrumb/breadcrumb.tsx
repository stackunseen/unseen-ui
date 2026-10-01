'use client';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import s from '../../shared/styles/site-navigation.module.css';

export interface BreadcrumbItem {
  /** Stable identity, unique within this trail. */
  id: string;
  label: ReactNode;
  /** Omit for a non-interactive ancestor. The current item never navigates. */
  href?: string;
  onClick?: ComponentPropsWithoutRef<'a'>['onClick'];
  target?: ComponentPropsWithoutRef<'a'>['target'];
  rel?: string;
}

export interface BreadcrumbProps extends Omit<ComponentPropsWithoutRef<'nav'>, 'children'> {
  items: readonly BreadcrumbItem[];
  label?: string;
  /** Defaults to the final item. An unmatched ID marks no item as current. */
  currentId?: string;
  /** Decorative only: do not supply interactive content. */
  separator?: ReactNode;
}

/** Native links preserve browser navigation, including modified clicks. */
export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(function Breadcrumb(
  { items, label = 'Breadcrumb', currentId, separator = '/', className = '', ...props },
  ref,
) {
  if (items.length === 0) return null;
  const selectedId = currentId ?? items.at(-1)?.id;
  return (
    <nav
      {...props}
      ref={ref}
      aria-label={props['aria-label'] ?? label}
      className={`${s.root} ${className}`}
      data-part="breadcrumb"
    >
      <ol className={s.breadcrumb}>
        {items.map((item, index) => {
          const current = item.id === selectedId;
          return (
            <li key={item.id} className={s.crumb}>
              {index > 0 && (
                <span aria-hidden="true" className={s.separator}>
                  {separator}
                </span>
              )}
              {item.href && !current ? (
                <a
                  href={item.href}
                  target={item.target}
                  rel={item.rel}
                  onClick={item.onClick}
                  className={s.crumbLink}
                >
                  {item.label}
                </a>
              ) : (
                <span aria-current={current ? 'page' : undefined} className={s.crumbText}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});
