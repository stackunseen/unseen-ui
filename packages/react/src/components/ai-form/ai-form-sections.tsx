import type { ReactNode } from 'react';
import { Button } from '../button/button.js';
import { IconButton } from '../icon-button/icon-button.js';
import type { AIArrayChange, AIFieldArray, AIFormRow, AIFormStep } from './form-model.js';
import s from '../../shared/styles/agent-controls.module.css';
import g from '../../shared/styles/structured.module.css';
import a from '../../shared/styles/action-layout.module.css';

interface AIFormStepsProps {
  steps: readonly AIFormStep[];
  currentIndex: number;
  titleId: string;
  disabled: boolean;
  onStepRequest: (index: number) => void;
}

export function AIFormSteps({
  steps,
  currentIndex,
  titleId,
  disabled,
  onStepRequest,
}: AIFormStepsProps) {
  const current = steps[currentIndex]!;
  return (
    <>
      <ol className={g.steps} aria-label="Form steps">
        {steps.map((item, index) => (
          <li key={item.id}>
            <Button
              variant={index === currentIndex ? 'secondary' : 'ghost'}
              aria-current={index === currentIndex ? 'step' : undefined}
              disabled={disabled}
              onClick={() => onStepRequest(index)}
            >
              {index + 1}. {item.title}
            </Button>
          </li>
        ))}
      </ol>
      <div className={g.stepHeader}>
        <strong id={titleId} tabIndex={-1}>
          {current.title}
        </strong>
        <span className={s.muted}>
          Step {currentIndex + 1} of {steps.length}
        </span>
        {current.description && <p className={s.muted}>{current.description}</p>}
      </div>
    </>
  );
}

interface AIFormArraySectionProps {
  id: string;
  addId: string;
  array: AIFieldArray;
  rows: readonly AIFormRow[];
  error?: string;
  disabled: boolean;
  onArrayChange: (request: AIArrayChange) => void;
  renderFields: (rowId: string) => ReactNode;
}

export function AIFormArraySection({
  id,
  addId,
  array,
  rows,
  error,
  disabled,
  onArrayChange,
  renderFields,
}: AIFormArraySectionProps) {
  const described =
    [array.description ? `${id}-description` : '', error ? `${id}-error` : '']
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <fieldset
      id={id}
      className={g.array}
      tabIndex={-1}
      aria-describedby={described}
      data-part="form-array"
    >
      <legend>{array.label}</legend>
      {array.description && (
        <p id={`${id}-description`} className={s.muted}>
          {array.description}
        </p>
      )}
      <p className={s.muted} role="status">
        {rows.length} {rows.length === 1 ? 'item' : 'items'} · {array.minItems ?? 0}-
        {array.maxItems ?? 20} allowed
      </p>
      {rows.length ? (
        <ol className={g.rows}>
          {rows.map((row, index) => (
            <li key={row.id}>
              <fieldset className={g.arrayRow} data-row-id={row.id}>
                <legend>
                  {array.label} item {index + 1}
                </legend>
                <div className={g.fields}>{renderFields(row.id)}</div>
                <div className={g.arrayActions}>
                  {array.reorderable && rows.length > 1 && (
                    <>
                      <IconButton
                        icon="moveUp"
                        disabled={disabled || index === 0}
                        label={`Move ${array.label} item ${index + 1} up`}
                        onClick={() =>
                          onArrayChange({
                            type: 'move',
                            arrayId: array.id,
                            rowId: row.id,
                            toIndex: index - 1,
                          })
                        }
                      />
                      <IconButton
                        icon="moveDown"
                        disabled={disabled || index === rows.length - 1}
                        label={`Move ${array.label} item ${index + 1} down`}
                        onClick={() =>
                          onArrayChange({
                            type: 'move',
                            arrayId: array.id,
                            rowId: row.id,
                            toIndex: index + 1,
                          })
                        }
                      />
                    </>
                  )}
                  <IconButton
                    icon="close"
                    disabled={disabled || rows.length <= (array.minItems ?? 0)}
                    label={`Remove ${array.label} item ${index + 1}`}
                    onClick={() =>
                      onArrayChange({ type: 'remove', arrayId: array.id, rowId: row.id })
                    }
                  />
                </div>
              </fieldset>
            </li>
          ))}
        </ol>
      ) : (
        <p className={s.muted}>No items added.</p>
      )}
      {error && (
        <p id={`${id}-error`} className={g.error}>
          {error}
        </p>
      )}
      <Button
        size="sm"
        className={a.local}
        id={addId}
        variant="outline"
        disabled={disabled || rows.length >= (array.maxItems ?? 20)}
        onClick={() => onArrayChange({ type: 'add', arrayId: array.id })}
      >
        Add {array.label}
      </Button>
    </fieldset>
  );
}
