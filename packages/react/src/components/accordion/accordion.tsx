'use client';
import type { ComponentProps, ReactNode } from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';

export interface AccordionItem {
  value: string;
  title: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

type RootProps = ComponentProps<typeof AccordionPrimitive.Root>;

type RootOptions<T> = T extends unknown ? Omit<T, 'children' | 'asChild'> : never;

export type AccordionProps = RootOptions<RootProps> &
  VariantProps<'Accordion'> & {
    items: readonly AccordionItem[];
    headingLevel?: 2 | 3 | 4 | 5 | 6;
    /** Use a labelled group for nested/repeated disclosures to avoid excess landmarks. */
    region?: boolean;
  };

/** Local disclosure state is optional; execution/approval state remains host-controlled. */
export function Accordion({
  region = true,
  variant = 'divided',
  items,
  headingLevel = 3,
  className = '',
  ...props
}: AccordionProps) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  return (
    <AccordionPrimitive.Root
      {...props}
      data-variant={variant}
      className={`${s.accordion} ${className}`}
    >
      {items.map((item) => (
        <AccordionPrimitive.Item
          key={item.value}
          value={item.value}
          disabled={item.disabled}
          className={s.accordionItem}
        >
          <AccordionPrimitive.Header asChild>
            <Heading className={s.accordionHeading}>
              <AccordionPrimitive.Trigger className={s.accordionTrigger}>
                <span>{item.title}</span>
                <AIIcon name="expand" className={s.accordionChevron} />
              </AccordionPrimitive.Trigger>
            </Heading>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content
            role={region ? 'region' : 'group'}
            className={s.accordionContent}
          >
            <div className={s.accordionBody}>{item.content}</div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
