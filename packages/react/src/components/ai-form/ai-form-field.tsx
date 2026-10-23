import { Select } from '../select/select.js';
import { Input } from '../input/input.js';
import { Textarea } from '../textarea/textarea.js';
import type { AIField } from './form-model.js';
import s from '../../shared/styles/agent-controls.module.css';
import g from '../../shared/styles/structured.module.css';

interface AIFormFieldProps {
  id: string;
  field: AIField;
  value: string | boolean;
  error?: string;
  disabled: boolean;
  onValueChange: (value: string | boolean) => void;
}

export function AIFormField({
  id,
  field,
  value,
  error,
  disabled,
  onValueChange,
}: AIFormFieldProps) {
  const help = [
    field.description,
    field.type === 'number' && (field.min !== undefined || field.max !== undefined)
      ? `${field.min ?? 'Any'} to ${field.max ?? 'any'}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');
  const truncated = typeof value === 'string' && value.length > 10000;
  const described =
    [help ? `${id}-help` : '', error ? `${id}-error` : '', truncated ? `${id}-preview` : '']
      .filter(Boolean)
      .join(' ') || undefined;
  const shared = {
    id,
    required: field.required,
    'aria-required': field.required || undefined,
    'aria-invalid': !!error,
    'aria-describedby': described,
    disabled,
  };
  const label = (
    <label htmlFor={id}>
      {field.label}
      {field.required ? ' *' : ''}
    </label>
  );
  return (
    <div className={g.field} data-part="form-field" data-field={field.id}>
      {field.type !== 'checkbox' && label}
      {field.type === 'select' ? (
        <Select
          {...shared}
          value={typeof value === 'string' ? value.slice(0, 10000) : ''}
          options={field.options ?? []}
          onValueChange={onValueChange}
        />
      ) : field.type === 'checkbox' ? (
        <div className={g.checkbox}>
          <input
            {...shared}
            type="checkbox"
            checked={value === true}
            onChange={(event) => onValueChange(event.target.checked)}
          />
          {label}
        </div>
      ) : field.type === 'textarea' ? (
        <Textarea
          {...shared}
          maxLength={10000}
          rows={3}
          value={typeof value === 'string' ? value.slice(0, 10000) : ''}
          onChange={(event) => onValueChange(event.target.value)}
        />
      ) : (
        <Input
          {...shared}
          type={field.type === 'number' ? 'number' : 'text'}
          min={field.min}
          max={field.max}
          step={field.type === 'number' ? 'any' : undefined}
          maxLength={10000}
          value={typeof value === 'string' ? value.slice(0, 10000) : ''}
          onChange={(event) => onValueChange(event.target.value)}
        />
      )}
      {help && (
        <span id={`${id}-help`} className={s.muted}>
          {help}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className={g.error}>
          {error}
        </span>
      )}
      {truncated && (
        <span id={`${id}-preview`} className={g.error}>
          The preview shows the first 10,000 characters. Shorten the value before submitting.
        </span>
      )}
    </div>
  );
}
