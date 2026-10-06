import { AIIcon } from '../../providers/icons/icons.js';
import type { SelectionOption } from './types.js';
import s from './selection.module.css';

export function matchingOptions<T extends SelectionOption>(
  options: readonly T[],
  query: string,
  filterOption?: false | ((option: T, query: string) => boolean),
) {
  const search = query.trim().toLowerCase();
  const values = new Set<string>();
  return options.filter((option) => {
    if (values.has(option.value)) return false;
    values.add(option.value);
    return (
      filterOption === false ||
      (filterOption
        ? filterOption(option, query)
        : [option.label, option.description ?? '', ...(option.keywords ?? [])].some((text) =>
            text.toLowerCase().includes(search),
          ))
    );
  });
}

export function optionDisabled(option: SelectionOption) {
  return !!(option.disabled || option.disabledReason);
}

export function SelectionOptions({
  options,
  selection,
  active,
  listId,
  onActiveChange,
  onSelect,
}: {
  options: readonly SelectionOption[];
  selection: readonly string[];
  active?: string;
  listId: string;
  onActiveChange: (value: string) => void;
  onSelect: (value: string) => void;
}) {
  return options.map((option, index) => (
    <div
      key={option.value}
      id={`${listId}-${index}`}
      role="option"
      aria-selected={selection.includes(option.value)}
      aria-disabled={optionDisabled(option) || undefined}
      data-active={active === option.value || undefined}
      className={s.option}
      onPointerMove={() => {
        if (!optionDisabled(option)) onActiveChange(option.value);
      }}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        if (!optionDisabled(option)) onSelect(option.value);
      }}
    >
      <span className={s.optionText}>
        <span>{option.label}</span>
        {(option.disabledReason || option.description) && (
          <small>{option.disabledReason || option.description}</small>
        )}
      </span>
      {selection.includes(option.value) && <AIIcon name="check" />}
    </div>
  ));
}
