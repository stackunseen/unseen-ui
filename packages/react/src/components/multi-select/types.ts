import type { SelectionOption, SelectionProps } from '../../shared/selection/types.js';

export type MultiSelectOption = SelectionOption;
export interface MultiSelectProps<
  T extends MultiSelectOption = MultiSelectOption,
> extends SelectionProps<T> {
  value: readonly string[];
  onValueChange: (value: readonly string[]) => void;
}
