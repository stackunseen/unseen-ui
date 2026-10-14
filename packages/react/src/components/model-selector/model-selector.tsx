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
  className?: string;
}

/** A compact model picker. The host validates the chosen model when the request runs. */
export function ModelSelector({
  models,
  value,
  onValueChange,
  label = 'Model',
  disabled = false,
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
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={className}
        disabled={disabled}
        aria-label={`${label}: ${current?.name ?? 'none selected'}`}
        data-part="model-selector"
      >
        {current?.name ?? 'Choose a model'}
        <ChevronDownIcon aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent title={label}>
        <input
          className={s.search}
          type="search"
          aria-label="Search models"
          placeholder="Search models…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {groups.length === 0 && <p className={s.meta}>No models match.</p>}
        {groups.map(([provider, options]) => (
          <fieldset key={provider} className={s.picker}>
            <legend>{provider}</legend>
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
                <span className={s.optionMark} aria-hidden="true">
                  {model.id === value && <CheckIcon />}
                </span>
                <span className={s.label}>{model.name}</span>
                {(model.description || model.disabledReason) && (
                  <span className={s.meta}>{model.disabledReason ?? model.description}</span>
                )}
              </label>
            ))}
          </fieldset>
        ))}
      </PopoverContent>
    </Popover>
  );
}
