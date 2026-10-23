'use client';
import type { ComponentProps } from 'react';
import * as Primitive from '@radix-ui/react-context-menu';
import { useThemeScope } from '../../providers/theme/theme-provider.js';
import s from '../../shared/styles/menus.module.css';
import m from '../../shared/styles/motion.module.css';

/** Local disclosure reports onOpenChange. Set dir on Root to carry RTL through portals. */
export type ContextMenuProps = ComponentProps<typeof Primitive.Root>;
export type ContextMenuContentProps = ComponentProps<typeof Primitive.Content> & {
  container?: ComponentProps<typeof Primitive.Portal>['container'];
};
export type ContextMenuItemProps = ComponentProps<typeof Primitive.Item> & {
  tone?: 'default' | 'danger';
};

function Root(props: ContextMenuProps) {
  return <Primitive.Root {...props} />;
}
function Trigger({
  disabled,
  tabIndex,
  onKeyDown,
  onContextMenu,
  className = '',
  ...props
}: ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger
      {...props}
      disabled={disabled}
      tabIndex={tabIndex ?? (disabled ? -1 : 0)}
      aria-haspopup="menu"
      aria-disabled={disabled || undefined}
      className={`${s.contextTrigger} ${className}`}
      onContextMenu={(event) => {
        onContextMenu?.(event);
        if (!disabled && !event.defaultPrevented) {
          event.currentTarget.focus();
          event.stopPropagation();
        }
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (
          disabled ||
          event.defaultPrevented ||
          event.target !== event.currentTarget ||
          !(event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        const bounds = event.currentTarget.getBoundingClientRect();
        // Use the same Radix opening/positioning path as a pointer context menu.
        event.currentTarget.dispatchEvent(
          new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            clientX: bounds.left + bounds.width / 2,
            clientY: bounds.top + bounds.height / 2,
          }),
        );
      }}
    />
  );
}
function Content({ container, forceMount, className = '', ...props }: ContextMenuContentProps) {
  const theme = useThemeScope();
  return (
    <Primitive.Portal container={container} forceMount={forceMount}>
      <Primitive.Content
        collisionPadding={12}
        loop
        {...props}
        forceMount={forceMount}
        {...theme.attributes}
        className={`${theme.scope} ${s.content} ${s.context} ${m.pop} ${className}`}
      />
    </Primitive.Portal>
  );
}
function Item({ tone = 'default', className = '', ...props }: ContextMenuItemProps) {
  return <Primitive.Item {...props} data-tone={tone} className={`${s.item} ${className}`} />;
}
function CheckboxItem({
  children,
  checked,
  className = '',
  ...props
}: Omit<ComponentProps<typeof Primitive.CheckboxItem>, 'asChild'>) {
  return (
    <Primitive.CheckboxItem
      {...props}
      checked={checked}
      className={`${s.item} ${s.checkItem} ${className}`}
    >
      <Primitive.ItemIndicator className={s.indicator} aria-hidden="true">
        {checked === 'indeterminate' ? '−' : '✓'}
      </Primitive.ItemIndicator>
      {children}
    </Primitive.CheckboxItem>
  );
}
function RadioItem({
  children,
  className = '',
  ...props
}: Omit<ComponentProps<typeof Primitive.RadioItem>, 'asChild'>) {
  return (
    <Primitive.RadioItem {...props} className={`${s.item} ${s.checkItem} ${className}`}>
      <Primitive.ItemIndicator className={s.indicator} aria-hidden="true">
        ●
      </Primitive.ItemIndicator>
      {children}
    </Primitive.RadioItem>
  );
}
function Label({ className = '', ...props }: ComponentProps<typeof Primitive.Label>) {
  return <Primitive.Label {...props} className={`${s.label} ${className}`} />;
}
function Separator({ className = '', ...props }: ComponentProps<typeof Primitive.Separator>) {
  return <Primitive.Separator {...props} className={`${s.separator} ${className}`} />;
}
function SubTrigger({ className = '', ...props }: ComponentProps<typeof Primitive.SubTrigger>) {
  return <Primitive.SubTrigger {...props} className={`${s.item} ${s.subTrigger} ${className}`} />;
}
function SubContent({
  container,
  forceMount,
  className = '',
  ...props
}: ComponentProps<typeof Primitive.SubContent> & {
  container?: ComponentProps<typeof Primitive.Portal>['container'];
}) {
  const theme = useThemeScope();
  return (
    <Primitive.Portal container={container} forceMount={forceMount}>
      <Primitive.SubContent
        sideOffset={4}
        collisionPadding={12}
        loop
        {...props}
        forceMount={forceMount}
        {...theme.attributes}
        className={`${theme.scope} ${s.content} ${s.context} ${m.pop} ${className}`}
      />
    </Primitive.Portal>
  );
}

/** Provide an equivalent visible action menu when contextual actions are essential. */
export const ContextMenu = {
  Root,
  Trigger,
  Content,
  Item,
  CheckboxItem,
  RadioGroup: Primitive.RadioGroup,
  RadioItem,
  Group: Primitive.Group,
  Label,
  Separator,
  Sub: Primitive.Sub,
  SubTrigger,
  SubContent,
};
/* Named parts for Server Components, where a client reference proxy has no static properties. */
export {
  Root as ContextMenuRoot,
  Trigger as ContextMenuTrigger,
  Content as ContextMenuContent,
  Item as ContextMenuItem,
  CheckboxItem as ContextMenuCheckboxItem,
  RadioItem as ContextMenuRadioItem,
  Label as ContextMenuLabel,
  Separator as ContextMenuSeparator,
  SubTrigger as ContextMenuSubTrigger,
  SubContent as ContextMenuSubContent,
};
export const ContextMenuRadioGroup = Primitive.RadioGroup;
export const ContextMenuGroup = Primitive.Group;
export const ContextMenuSub = Primitive.Sub;
