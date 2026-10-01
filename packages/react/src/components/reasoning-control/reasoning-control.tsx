'use client';
import { useId } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Select } from '../select/select.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/agent-controls.module.css';

export interface ReasoningOption {
  id: string;
  label: string;
  description?: string;
}

export interface ReasoningControlProps extends VariantProps<'ReasoningControl'> {
  options: readonly ReasoningOption[];
  value?: string;
  onValueChange: (id: string) => void;
  disabled?: boolean;
  label?: string;
}

export function ReasoningControl({
  options,
  value,
  onValueChange,
  disabled,
  label = 'Reasoning effort',
  variant = 'slider',
}: ReasoningControlProps) {
  const id = useId();
  const index = options.findIndex((option) => option.id === value);
  const current = options[index];
  return (
    <div
      className={`${s.root} ${variant === 'slider' ? s.surface : ''}`}
      data-part="reasoning-control"
      data-variant={variant}
    >
      <div className={s.header}>
        <strong id={id}>{label}</strong>
        <span className={s.tag}>{current?.label ?? 'Not selected'}</span>
      </div>
      {!options.length ? (
        <p role="status" className={s.muted}>
          This model does not expose reasoning settings.
        </p>
      ) : variant === 'slider' && index >= 0 && options.length > 1 ? (
        <>
          <Slider.Root
            className={s.slider}
            value={[index]}
            min={0}
            max={options.length - 1}
            step={1}
            disabled={disabled}
            onValueChange={([next]) => {
              if (options[next!]) onValueChange(options[next!]!.id);
            }}
          >
            <Slider.Track className={s.track}>
              <Slider.Range className={s.range} />
            </Slider.Track>
            <Slider.Thumb
              className={s.thumb}
              aria-labelledby={id}
              aria-valuetext={current?.label}
            />
          </Slider.Root>
          <div className={s.ticks} aria-hidden="true">
            {options.map((option) => (
              <span key={option.id}>{option.label}</span>
            ))}
          </div>
        </>
      ) : variant === 'segmented' ? (
        <fieldset className={s.fieldset} disabled={disabled}>
          <legend className={s.muted}>Choose an effort level</legend>
          <div className={s.segments}>
            {options.map((option) => (
              <label key={option.id} className={s.choice}>
                <input
                  type="radio"
                  name={id}
                  checked={value === option.id}
                  onChange={() => onValueChange(option.id)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <Select
          aria-labelledby={id}
          value={current?.id ?? ''}
          options={options.map((option) => ({ value: option.id, label: option.label }))}
          onValueChange={onValueChange}
          disabled={disabled}
        />
      )}
      {current?.description && <p className={s.muted}>{current.description}</p>}
    </div>
  );
}
