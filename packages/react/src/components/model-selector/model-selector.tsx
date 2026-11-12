'use client';
import { useId, useMemo, useState } from 'react';
import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { Popover, PopoverContent, PopoverTrigger } from '../popover/popover.js';
import s from '../../shared/styles/assistant.module.css';

export interface ModelOption {
  id: string;
  name: string;
  /** Groups options, for example by provider. */
  provider?: string;
  description?: string;
  /** Host-reported reason the model cannot be chosen. */
  disabledReason?: string;
}
export interface ModelSelectorProps {
  models: readonly ModelOption[];
  value: string;
  onValueChange: (id: string) => void;
  label?: string;
  disabled?: boolean;
  /** `ghost` reads as quiet text, for a composer toolbar. */
  variant?: 'outline' | 'ghost';
  /** Shows a search field. Defaults to on only for long lists (more than seven models). */
  searchable?: boolean;
  /** Replaces the built-in wording, for example to translate it. */
  labels?: Partial<ModelSelectorLabels>;
  className?: string;
}
export interface ModelSelectorLabels {
  /** Trigger text when `value` matches no model. */
  placeholder: string;
  /** Spoken after the label when nothing is selected: "Model: none selected". */
  noneSelected: string;
  search: string;
  searchPlaceholder: string;
  empty: string;
  /** Group name for models without a provider. */
  ungrouped: string;
}
const defaultLabels: ModelSelectorLabels = {
  placeholder: 'Choose a model',
  noneSelected: 'none selected',
  search: 'Search models',
  searchPlaceholder: 'Search models…',
  empty: 'No models match.',
  ungrouped: 'Models',
};

/**
 * A compact model picker, laid out like ChatGPT's: each model on a row with its description, a
 * check beside the current one. The host validates the chosen model when the request runs.
 */
export function ModelSelector({
  models,
  value,
  onValueChange,
  label = 'Model',
  disabled = false,
  variant = 'outline',
  searchable = models.length > 7,
  labels,
  className = '',
}: ModelSelectorProps) {
  const id = useId();
  const text = { ...defaultLabels, ...labels };
  const ungrouped = text.ungrouped;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const current = models.find((model) => model.id === value);
  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const groups = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase();
    const shown = models.filter((model) =>
      `${model.name} ${model.provider ?? ''} ${model.description ?? ''}`
        .toLocaleLowerCase()
        .includes(terms),
    );
    const map = new Map<string, ModelOption[]>();
    for (const model of shown) {
      const key = model.provider ?? ungrouped;
      map.set(key, [...(map.get(key) ?? []), model]);
    }
    return [...map];
  }, [models, query, ungrouped]);
  // Provider headings help only when there is more than one provider to tell apart.
  const providers = new Set(models.map((model) => model.provider ?? ungrouped)).size;
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger
        className={className}
        variant={variant}
        size={variant === 'ghost' ? 'sm' : undefined}
        disabled={disabled}
        aria-label={`${label}: ${current?.name ?? text.noneSelected}`}
        data-part="model-selector"
      >
        {current?.name ?? text.placeholder}
        <ChevronDownIcon aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent title={label} align="start" className={s.modelMenu}>
        {searchable && (
          <input
            className={s.search}
            type="search"
            aria-label={text.search}
            placeholder={text.searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        )}
        {groups.length === 0 && <p className={s.meta}>{text.empty}</p>}
        {groups.map(([provider, options]) => (
          <fieldset key={provider} className={s.picker}>
            <legend className={providers > 1 ? undefined : s.srOnly}>{provider}</legend>
            {options.map((model) => (
              <label
                key={model.id}
                className={s.option}
                data-checked={model.id === value || undefined}
              >
                <input
                  className={s.optionInput}
                  type="radio"
                  name={`${id}-model`}
                  value={model.id}
                  checked={model.id === value}
                  disabled={!!model.disabledReason}
                  // Arrow keys move the choice and keep the menu open, as in any radio group;
                  // a pointer press, Enter or Space confirms and closes.
                  onChange={() => onValueChange(model.id)}
                  onClick={(event) => {
                    if (event.detail > 0) close();
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    if (model.id !== value) onValueChange(model.id);
                    close();
                  }}
                />
                <span className={s.label}>{model.name}</span>
                {(model.description || model.disabledReason) && (
                  <span className={s.meta}>{model.disabledReason ?? model.description}</span>
                )}
                <span className={s.optionMark} aria-hidden="true">
                  {model.id === value && <CheckIcon />}
                </span>
              </label>
            ))}
          </fieldset>
        ))}
      </PopoverContent>
    </Popover>
  );
}
