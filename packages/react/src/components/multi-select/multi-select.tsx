'use client';
import { useRef } from 'react';
import { Button } from '../button/button.js';
import { AIIcon } from '../../providers/icons/icons.js';
import { SelectionPicker } from '../../shared/selection/selection-picker.js';
import type { MultiSelectOption, MultiSelectProps } from './types.js';
import s from './multi-select.module.css';

export type { MultiSelectOption, MultiSelectProps } from './types.js';

/** The multiple form of Combobox; internal. */
export function MultiSelect<T extends MultiSelectOption>({
  value,
  onValueChange,
  ...props
}: MultiSelectProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selection = [...new Set(value)];
  function remove(item: string) {
    onValueChange(selection.filter((selected) => selected !== item));
    inputRef.current?.focus();
  }
  return (
    <SelectionPicker
      {...props}
      inputRef={inputRef}
      selection={selection}
      multiple
      data-part="multi-select"
      onSelect={(item) =>
        onValueChange(
          selection.includes(item)
            ? selection.filter((selected) => selected !== item)
            : [...selection, item],
        )
      }
    >
      {(summaryId) =>
        selection.length === 0 ? (
          <span id={summaryId} className={s.summary}>
            No options selected.
          </span>
        ) : (
          <>
            <span id={summaryId} hidden>
              {selection.length} options selected.
            </span>
            <ul aria-label={`${props.label} selected options`} className={s.chips}>
              {selection.slice(0, 200).map((item) => {
                const option = props.options.find((candidate) => candidate.value === item);
                const label = option?.label ?? item;
                return (
                  <li key={item} className={s.chip}>
                    <span>
                      {label}
                      {!option && <small> (details unavailable)</small>}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={props.disabled}
                      aria-label={`Remove ${label}`}
                      onClick={() => remove(item)}
                    >
                      <AIIcon name="close" />
                    </Button>
                  </li>
                );
              })}
              {selection.length > 200 && (
                <li className={s.summary}>{selection.length - 200} more selected.</li>
              )}
            </ul>
          </>
        )
      }
    </SelectionPicker>
  );
}
