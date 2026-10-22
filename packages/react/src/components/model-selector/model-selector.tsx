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
  className?: string;
}

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
  className = '',
}: ModelSelectorProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const current = models.find((model) => model.id === value);
  const groups = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase();
    const shown = models.filter((model) =>
      `${model.name} ${model.provider ?? ''} ${model.description ?? ''}`
        .toLocaleLowerCase()
        .includes(terms),
    );
    const map = new Map<string, ModelOption[]>();
    for (const model of shown) {
      const key = model.provider ?? 'Models';
      map.set(key, [...(map.get(key) ?? []), model]);
    }
    return [...map];
  }, [models, query]);
  // Provider headings help only when there is more than one provider to tell apart.
  const providers = new Set(models.map((model) => model.provider ?? 'Models')).size;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={className}
        variant={variant}
        size={variant === 'ghost' ? 'sm' : undefined}
        disabled={disabled}
        aria-label={`${label}: ${current?.name ?? 'none selected'}`}
        data-part="model-selector"
      >
        {current?.name ?? 'Choose a model'}
        <ChevronDownIcon aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent title={label} align="start" className={s.modelMenu}>
        {searchable && (
          <input
            className={s.search}
            type="search"
            aria-label="Search models"
            placeholder="Search models…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        )}
        {groups.length === 0 && <p className={s.meta}>No models match.</p>}
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
                  onChange={() => {
                    onValueChange(model.id);
                    setOpen(false);
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
