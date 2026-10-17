import type { SelectionOption, SelectionProps } from '../../shared/selection/types.js';

export type ComboboxOption = SelectionOption;
export interface SingleComboboxProps<
  T extends ComboboxOption = ComboboxOption,
> extends SelectionProps<T> {
  type?: 'single';
  value: string | null;
  onValueChange: (value: string | null) => void;
}
/** Several values: chosen options show as removable chips below the field. */
export interface MultipleComboboxProps<
  T extends ComboboxOption = ComboboxOption,
> extends SelectionProps<T> {
  type: 'multiple';
  value: readonly string[];
  onValueChange: (value: readonly string[]) => void;
}
export type ComboboxProps<T extends ComboboxOption = ComboboxOption> =
  SingleComboboxProps<T> | MultipleComboboxProps<T>;
