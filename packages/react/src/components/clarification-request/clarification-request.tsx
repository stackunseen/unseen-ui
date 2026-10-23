'use client';
import { useId, useState } from 'react';
import { Button } from '../button/button.js';
import { Panel } from '../panel/panel.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import a from '../../shared/styles/action-layout.module.css';

export function ClarificationRequest({
  variant = 'card',
  question,
  value,
  onValueChange,
  onSubmit,
  choices,
  state = 'pending',
  error,
}: VariantProps<'ClarificationRequest'> & {
  question: string;
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (value: string) => void;
  choices?: { value: string; label: string }[];
  state?: 'pending' | 'submitting' | 'resolved' | 'cancelled';
  error?: string;
}) {
  const id = useId();
  const [attempted, setAttempted] = useState(false);
  const valid = value.trim().length > 0 && (!choices || choices.some((c) => c.value === value));
  const validationMessage =
    error ||
    (attempted && !valid
      ? choices
        ? 'Choose an answer to continue.'
        : 'Enter an answer to continue.'
      : '');
  return (
    <Panel data-part="clarification-request" data-variant={variant} className={s.clarification}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (state !== 'pending') return;
          setAttempted(true);
          if (valid) onSubmit(value.trim());
          else e.currentTarget.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus();
        }}
      >
        <fieldset
          className={s.fieldset}
          disabled={state !== 'pending'}
          aria-describedby={validationMessage ? `${id}-error` : undefined}
        >
          <legend className={s.title}>{question}</legend>
          {choices ? (
            choices.map((choice) => (
              <label className={s.radio} key={choice.value}>
                <input
                  type="radio"
                  name={id}
                  value={choice.value}
                  checked={value === choice.value}
                  aria-invalid={!!validationMessage}
                  aria-describedby={validationMessage ? `${id}-error` : undefined}
                  required
                  onChange={() => onValueChange(choice.value)}
                />
                {choice.label}
              </label>
            ))
          ) : (
            <label className={s.field}>
              Your answer
              <input
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                aria-describedby={`${id}-error`}
                aria-invalid={!!validationMessage}
                maxLength={4000}
                required
              />
            </label>
          )}
        </fieldset>
        <p id={`${id}-error`} role="status" className={s.error}>
          {validationMessage}
        </p>
        <div className={a.footer} role="group" aria-label="Answer submission">
          <Button type="submit" disabled={state !== 'pending'}>
            {state === 'submitting'
              ? 'Submitting…'
              : state === 'resolved'
                ? 'Answer received'
                : state === 'cancelled'
                  ? 'Cancelled'
                  : 'Continue'}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
