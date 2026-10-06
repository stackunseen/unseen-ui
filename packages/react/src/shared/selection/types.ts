import type { ComponentPropsWithoutRef } from 'react';

export interface SelectionOption {
  /** Stable, unique identity; labels can change without changing the selection. */
  value: string;
  label: string;
  description?: string;
  keywords?: readonly string[];
  disabled?: boolean;
  disabledReason?: string;
}

export interface SelectionProps<T extends SelectionOption = SelectionOption> extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'onChange' | 'onSelect' | 'defaultValue'
> {
  /** Visible label for the search input and option list. */
  label: string;
  options: readonly T[];
  query: string;
  onQueryChange: (query: string) => void;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** An accessibility hint; validate the controlled selection in the host. */
  required?: boolean;
  status?: 'ready' | 'loading' | 'error';
  error?: string;
  /** false delegates filtering to the host, for example for remote searches. */
  filterOption?: false | ((option: T, query: string) => boolean);
}
