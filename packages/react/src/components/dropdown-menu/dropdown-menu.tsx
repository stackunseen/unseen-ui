'use client';
import type { ComponentProps } from 'react';
import * as Primitive from '@radix-ui/react-dropdown-menu';
import { ThemeSurface } from '../../providers/theme/theme-provider.js';
import s from '../../shared/styles/menus.module.css';

/** Set dir on Root to carry RTL through portaled menus and submenus. */
export type DropdownMenuProps = ComponentProps<typeof Primitive.Root>;
export type DropdownMenuContentProps = ComponentProps<typeof Primitive.Content> & {
  /** Optional portal host, for example a shadow root's element. */
  container?: ComponentProps<typeof Primitive.Portal>['container'];
};
export type DropdownMenuItemProps = ComponentProps<typeof Primitive.Item> & {
  tone?: 'default' | 'danger';
};

function Root(props: DropdownMenuProps) {
  return <Primitive.Root {...props} />;
}
function Trigger({ className = '', ...props }: ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger {...props} className={`${s.trigger} ${className}`} />;
}
function Content({ container, forceMount, className = '', ...props }: DropdownMenuContentProps) {
  return (
    <Primitive.Portal container={container} forceMount={forceMount}>
      <ThemeSurface>
        <Primitive.Content
          sideOffset={6}
          collisionPadding={12}
          loop
          {...props}
          forceMount={forceMount}
          className={`${s.content} ${s.dropdown} ${className}`}
        />
      </ThemeSurface>
    </Primitive.Portal>
  );
}
function Item({ tone = 'default', className = '', ...props }: DropdownMenuItemProps) {
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
  return (
    <Primitive.Portal container={container} forceMount={forceMount}>
      <ThemeSurface>
        <Primitive.SubContent
          sideOffset={4}
          collisionPadding={12}
          loop
          {...props}
          forceMount={forceMount}
          className={`${s.content} ${s.dropdown} ${className}`}
        />
      </ThemeSurface>
    </Primitive.Portal>
  );
}

/** Action menu. Content owns its themed portal; selection is an intent, not execution. */
export const DropdownMenu = {
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
  Root as DropdownMenuRoot,
  Trigger as DropdownMenuTrigger,
  Content as DropdownMenuContent,
  Item as DropdownMenuItem,
  CheckboxItem as DropdownMenuCheckboxItem,
  RadioItem as DropdownMenuRadioItem,
  Label as DropdownMenuLabel,
  Separator as DropdownMenuSeparator,
  SubTrigger as DropdownMenuSubTrigger,
  SubContent as DropdownMenuSubContent,
};
export const DropdownMenuRadioGroup = Primitive.RadioGroup;
export const DropdownMenuGroup = Primitive.Group;
export const DropdownMenuSub = Primitive.Sub;
