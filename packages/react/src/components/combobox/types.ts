import type { SelectionOption, SelectionProps } from '../../shared/selection/types.js';

export type ComboboxOption = SelectionOption;
export interface ComboboxProps<
  T extends ComboboxOption = ComboboxOption,
> extends SelectionProps<T> {
  value: string | null;
  onValueChange: (value: string | null) => void;
}
