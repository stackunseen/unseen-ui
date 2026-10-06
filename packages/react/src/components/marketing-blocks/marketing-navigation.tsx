'use client';
import { useId, useRef, useState } from 'react';
import { Button } from '../button/button.js';
import type { MarketingFooterProps, MarketingHeaderProps } from './types.js';

export function MarketingHeader({
  brand,
  links,
  actions,
  navigationLabel = 'Primary navigation',
  menuLabel = 'Menu',
  className = '',
  children,
  ...props
}: MarketingHeaderProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  function closeMenu() {
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <header {...props} className={`uim-header ${className}`}>
      <div className="uim-brand">{brand}</div>
      <Button
        ref={trigger}
        variant="outline"
        className="uim-menu-trigger"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(!open)}
      >
        {menuLabel}
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </Button>
      <div
        id={menuId}
        className="uim-navigation"
        data-open={open}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) closeMenu();
        }}
      >
        <nav aria-label={navigationLabel}>
          {links.map((link) => (
            <a
              key={link.id}
              href={link.href}
              onClick={() => {
                if (open) closeMenu();
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>
        {actions && <div className="uim-header-actions">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

export function MarketingFooter({
  brand,
  description,
  groups,
  copyright,
  children,
  className = '',
  ...props
}: MarketingFooterProps) {
  return (
    <footer {...props} className={`uim-footer ${className}`}>
      <div className="uim-footer-top">
        <div className="uim-footer-brand">
          <div className="uim-brand">{brand}</div>
          {description && <p>{description}</p>}
        </div>
        {groups.map((group) => (
          <nav key={group.id} aria-label={group.title}>
            <h2>{group.title}</h2>
            {group.links.map((link) => (
              <a key={link.id} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        ))}
      </div>
      <div className="uim-footer-bottom">
        <span>{copyright}</span>
        {children}
      </div>
    </footer>
  );
}
