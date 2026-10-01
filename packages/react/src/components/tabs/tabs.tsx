'use client';
import type { ReactNode } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';

export function Tabs({
  variant = 'underline',
  value,
  onValueChange,
  items,
  label,
}: VariantProps<'Tabs'> & {
  value: string;
  onValueChange: (value: string) => void;
  items: { value: string; label: string; content: ReactNode }[];
  label: string;
}) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange}>
      <TabsPrimitive.List className={s.tabs} data-variant={variant} aria-label={label}>
        {items.map((item) => (
          <TabsPrimitive.Trigger className={s.tab} key={item.value} value={item.value}>
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content className={s.tabContent} key={item.value} value={item.value}>
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
