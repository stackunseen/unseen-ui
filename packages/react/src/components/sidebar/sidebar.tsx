'use client';
import { forwardRef, useId } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import s from '../../shared/styles/site-navigation.module.css';

export interface SidebarProps extends ComponentPropsWithoutRef<'nav'> {
  label?: string;
  /** Use div inside an existing navigation landmark, such as WorkspaceShell.navigation. */
  as?: 'nav' | 'div';
}

/** Site navigation uses native links and Tab order, not application-menu arrow keys.
 * Compose inside the existing Sidecar for a controlled mobile drawer.
 */
const SidebarRoot = forwardRef<HTMLElement, SidebarProps>(function Sidebar(
  { label = 'Main navigation', as: Element = 'nav', className = '', ...props },
  ref,
) {
  return (
    <Element
      {...props}
      ref={ref as React.Ref<HTMLDivElement>}
      aria-label={Element === 'nav' ? (props['aria-label'] ?? label) : undefined}
      className={`${s.root} ${s.sidebar} ${className}`}
      data-part="sidebar"
    />
  );
});

export interface SidebarGroupProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  /** A visible, programmatically associated group title; labels stay visible at narrow widths. */
  label?: ReactNode;
}

const SidebarGroup = forwardRef<HTMLDivElement, SidebarGroupProps>(function SidebarGroup(
  { label, children, className = '', ...props },
  ref,
) {
  const titleId = useId();
  const hasLabel = label !== undefined && label !== null && label !== false;
  return (
    <div
      {...props}
      ref={ref}
      role={hasLabel ? 'group' : undefined}
      aria-labelledby={hasLabel ? titleId : undefined}
      className={`${s.sidebarGroup} ${className}`}
      data-part="sidebar-group"
    >
      {hasLabel && (
        <div id={titleId} className={s.groupLabel}>
          {label}
        </div>
      )}
      <ul className={s.sidebarList}>{children}</ul>
    </div>
  );
});

export interface SidebarLinkProps extends Omit<
  ComponentPropsWithoutRef<'a'>,
  'href' | 'children' | 'aria-current' | 'aria-disabled'
> {
  href: string;
  /** A visible text label. Icons are supplementary, never the sole label. */
  children: ReactNode;
  current?: boolean;
  disabled?: boolean;
  /** Decorative only: do not supply interactive content. */
  icon?: ReactNode;
  /** Optional visible supporting text, included in the link's accessible name. */
  badge?: ReactNode;
}

const SidebarLink = forwardRef<HTMLAnchorElement, SidebarLinkProps>(function SidebarLink(
  {
    href,
    children,
    current = false,
    disabled = false,
    icon,
    badge,
    className = '',
    onClick,
    onAuxClick,
    tabIndex,
    ...props
  },
  ref,
) {
  return (
    <li className={s.sidebarItem}>
      <a
        {...props}
        ref={ref}
        href={disabled ? undefined : href}
        role="link"
        aria-current={current ? 'page' : undefined}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : tabIndex}
        className={`${s.sidebarLink} ${className}`}
        data-part="sidebar-link"
        onClick={(event) => {
          if (disabled) event.preventDefault();
          else onClick?.(event);
        }}
        onAuxClick={(event) => {
          if (disabled) event.preventDefault();
          else onAuxClick?.(event);
        }}
      >
        {icon !== undefined && (
          <span aria-hidden="true" className={s.icon}>
            {icon}
          </span>
        )}
        <span className={s.linkLabel}>{children}</span>
        {badge !== undefined && <span className={s.badge}>{badge}</span>}
      </a>
    </li>
  );
});

export const Sidebar = Object.assign(SidebarRoot, { Group: SidebarGroup, Link: SidebarLink });
