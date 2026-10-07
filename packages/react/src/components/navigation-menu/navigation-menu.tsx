'use client';
import { useCallback, useEffect, useRef } from 'react';
import type { ComponentProps } from 'react';
import * as Primitive from '@radix-ui/react-navigation-menu';
import s from '../../shared/styles/menus.module.css';

export type NavigationMenuProps = ComponentProps<typeof Primitive.Root>;
export type NavigationMenuLinkProps = ComponentProps<typeof Primitive.Link>;

function Root({ className = '', ...props }: NavigationMenuProps) {
  return <Primitive.Root aria-label="Main" {...props} className={`${s.navigation} ${className}`} />;
}
function List({ className = '', ...props }: ComponentProps<typeof Primitive.List>) {
  return <Primitive.List {...props} className={`${s.navigationList} ${className}`} />;
}
function Item({ className = '', ...props }: ComponentProps<typeof Primitive.Item>) {
  return <Primitive.Item {...props} className={`${s.navigationItem} ${className}`} />;
}
function Trigger({ className = '', ...props }: ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger
      {...props}
      className={`${s.navigationControl} ${s.navigationTrigger} ${className}`}
    />
  );
}
function Content({
  className = '',
  ref,
  onFocusOutside,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const pendingFocus = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setRef = useCallback(
    (element: HTMLDivElement | null) => {
      contentRef.current = element;
      if (typeof ref === 'function') {
        const cleanup = ref(element);
        if (typeof cleanup === 'function')
          return () => {
            contentRef.current = null;
            cleanup();
          };
      } else if (ref) ref.current = element;
    },
    [ref],
  );
  useEffect(
    () => () => {
      if (pendingFocus.current !== null) clearTimeout(pendingFocus.current);
    },
    [],
  );
  return (
    <Primitive.Content
      role="group"
      tabIndex={-1}
      {...props}
      ref={setRef}
      className={`${s.navigationContent} ${className}`}
      onFocusOutside={(event) => {
        onFocusOutside?.(event);
        if (event.defaultPrevented) return;
        const content = contentRef.current;
        const target = event.target;
        if (!content || !(target instanceof HTMLElement) || !target.closest('[aria-hidden="true"]'))
          return;
        const navigation = content.closest('nav, [role="navigation"]');
        if (!navigation?.contains(target)) return;
        if (pendingFocus.current !== null) clearTimeout(pendingFocus.current);
        // Let the primitive and native Tab finish first. Empty panels otherwise leave
        // focus on a hidden sentinel; the labelled group is a meaningful fallback.
        pendingFocus.current = setTimeout(() => {
          pendingFocus.current = null;
          if (
            content.isConnected &&
            content.dataset.state === 'open' &&
            content.ownerDocument.activeElement === target &&
            target.closest('[aria-hidden="true"]')
          ) {
            content.focus();
          }
        }, 0);
      }}
    />
  );
}
function Link({ className = '', ...props }: NavigationMenuLinkProps) {
  return <Primitive.Link {...props} className={`${s.navigationControl} ${className}`} />;
}

/** Site navigation uses native links, not application menu roles. Use Link asChild for routers. */
export const NavigationMenu = { Root, List, Item, Trigger, Content, Link };
/* Named parts for Server Components, where a client reference proxy has no static properties. */
export {
  Root as NavigationMenuRoot,
  List as NavigationMenuList,
  Item as NavigationMenuItem,
  Trigger as NavigationMenuTrigger,
  Content as NavigationMenuContent,
  Link as NavigationMenuLink,
};
