import type { ComponentProps, ElementType } from 'react';

/**
 * A component's own props plus every other attribute its root element takes, `ref` included.
 * On a name clash the component's own prop wins.
 */
export type WithRoot<Own, Root extends ElementType> = Own extends unknown
  ? Own & Omit<ComponentProps<Root>, keyof Own>
  : never;
