'use client';
import { useRef } from 'react';
import { AIIcon } from '../../providers/icons/icons.js';
import { SelectionPicker } from '../../shared/selection/selection-picker.js';
import type { ComboboxOption, ComboboxProps, SingleComboboxProps } from './types.js';
import { MultiSelect } from '../multi-select/multi-select.js';
import s from './combobox.module.css';

export type {
  ComboboxOption,
  ComboboxProps,
  SingleComboboxProps,
  MultipleComboboxProps,
} from './types.js';

/**
 * Search a list and choose one value, or several with type="multiple". Query and selected
 * identity change only when the host supplies replacement props.
 */
export function Combobox<T extends ComboboxOption>(props: ComboboxProps<T>) {
  if (props.type === 'multiple') {
    const { type: _type, ...rest } = props;
    void _type;
    return <MultiSelect {...rest} />;
  }
  return <SingleCombobox {...props} />;
}

function SingleCombobox<T extends ComboboxOption>({
  type: _type,
  value,
  onValueChange,
  ...props
}: SingleComboboxProps<T>) {
  void _type;
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = props.options.find((option) => option.value === value);
  const summary = value === null ? 'No option selected.' : `Selected: ${selected?.label ?? value}`;
  return (
    <SelectionPicker
      {...props}
      inputRef={inputRef}
      selection={value === null ? [] : [value]}
      onSelect={onValueChange}
      data-part="combobox"
      displayValue={value === null ? undefined : (selected?.label ?? value)}
      trailing={
        value === null ? (
          <AIIcon name="expand" />
        ) : (
          <button
            type="button"
            className={s.clear}
            disabled={props.disabled}
            aria-label={`Clear ${props.label}`}
            onClick={() => {
              onValueChange(null);
              inputRef.current?.focus();
            }}
          >
            <AIIcon name="close" />
          </button>
        )
      }
    >
      {(summaryId) => (
        <div className={s.selection}>
          <span id={summaryId} className={s.srOnly}>
            {summary}
          </span>
          {value !== null && !selected && <span>Option details unavailable.</span>}
        </div>
      )}
    </SelectionPicker>
  );
}
