'use client';
import { useRef } from 'react';
import { Button } from '../button/button.js';
import { AIIcon } from '../../providers/icons/icons.js';
import { SelectionPicker } from '../../shared/selection/selection-picker.js';
import type { ComboboxOption, ComboboxProps } from './types.js';
import s from './combobox.module.css';

export type { ComboboxOption, ComboboxProps } from './types.js';

/** Query and selected identity change only when the host supplies replacement props. */
export function Combobox<T extends ComboboxOption>({
  value,
  onValueChange,
  ...props
}: ComboboxProps<T>) {
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
    >
      {(summaryId) => (
        <div className={s.selection}>
          <span id={summaryId}>{summary}</span>
          {value !== null && !selected && <span>Option details unavailable.</span>}
          {value !== null && (
            <Button
              size="sm"
              variant="ghost"
              disabled={props.disabled}
              aria-label={`Clear ${props.label}`}
              onClick={() => {
                onValueChange(null);
                inputRef.current?.focus();
              }}
            >
              <AIIcon name="close" /> Clear
            </Button>
          )}
        </div>
      )}
    </SelectionPicker>
  );
}
