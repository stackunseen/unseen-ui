'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../button/button.js';
import { AIFormField } from './ai-form-field.js';
import { AIFormArraySection, AIFormSteps } from './ai-form-sections.js';
import { LoadingIndicator } from '../loading-indicator/loading-indicator.js';
import type { VariantProps } from '../../shared/variants.js';
import {
  fieldIssue,
  inspectArrayValues,
  inspectFormSchema,
  sameFormIdentity,
  visibleFields,
} from './form-model.js';
import type {
  AIArrayChange,
  AIArrayErrors,
  AIArrayValues,
  AIField,
  AIFieldArray,
  AIFormIdentity,
  AIFormReceipt,
  AIFormStep,
  AIFormSubmission,
  FormValues,
} from './form-model.js';
export type {
  AIArrayChange,
  AIArrayErrors,
  AIArrayValues,
  AIField,
  AIFieldArray,
  AIFormIdentity,
  AIFormReceipt,
  AIFormRow,
  AIFormStep,
  AIFormSubmission,
  FormValues,
} from './form-model.js';
import s from '../../shared/styles/agent-controls.module.css';
import g from '../../shared/styles/structured.module.css';
import a from '../../shared/styles/action-layout.module.css';

export interface AIFormProps extends VariantProps<'AIForm'> {
  fields: readonly AIField[];
  values: FormValues;
  onValueChange: (values: FormValues) => void;
  onSubmit: (values: FormValues, submission?: AIFormSubmission) => void;
  arrays?: readonly AIFieldArray[];
  arrayValues?: AIArrayValues;
  onArrayChange?: (request: AIArrayChange) => void;
  arrayErrors?: AIArrayErrors;
  steps?: readonly AIFormStep[];
  step?: string;
  onStepChange?: (step: string) => void;
  identity?: AIFormIdentity;
  status?:
    'ready' | 'pending' | 'complete' | 'error' | 'loading' | 'denied' | 'stale' | 'unavailable';
  errors?: Record<string, string>;
  receipt?: string | AIFormReceipt;
  title?: string;
}
interface Entry {
  key: string;
  field: AIField;
  value: string | boolean;
  group: string;
  array?: string;
  row?: string;
}
interface Issue {
  message: string;
  value: unknown;
  group: string;
}
export function AIForm({
  fields,
  values,
  onValueChange,
  onSubmit,
  arrays = [],
  arrayValues = {},
  onArrayChange,
  arrayErrors = {},
  steps,
  step,
  onStepChange,
  identity,
  status = 'ready',
  errors = {},
  receipt,
  title = 'Details',
  variant = 'stacked',
}: AIFormProps) {
  const prefix = useId();
  const form = useRef<HTMLFormElement>(null);
  const [validation, setValidation] = useState<{ scope: string; issues: Record<string, Issue> }>();
  const focusRequest = useRef<{ scope: string; step: string; key?: string } | undefined>(undefined);
  const rowFocus = useRef<
    | { scope: string; array: string; row?: string; ids: string[]; type: 'add' | 'remove' }
    | undefined
  >(undefined);
  const schemaError = inspectFormSchema(fields, arrays, steps, identity);
  const valueError = schemaError
    ? undefined
    : !values || typeof values !== 'object' || Array.isArray(values)
      ? 'Form values must be a controlled field record.'
      : inspectArrayValues(arrays, arrayValues, fields.length);
  const scope = schemaError ? '' : JSON.stringify([fields, arrays, steps, identity]);
  const currentIndex = steps?.findIndex((s) => s.id === step) ?? -1;
  const stepUnavailable = !schemaError && steps !== undefined && currentIndex < 0;
  const hidden = ['loading', 'denied', 'stale', 'unavailable'].includes(status);
  const locked =
    hidden ||
    status === 'pending' ||
    status === 'complete' ||
    Boolean(schemaError || valueError || stepUnavailable);
  const activeFields = schemaError || valueError || hidden ? [] : visibleFields(fields, values);
  const activeArrays =
    schemaError || valueError || hidden
      ? []
      : arrays.filter(
          (array) =>
            !array.when ||
            (activeFields.some((f) => f.id === array.when!.field) &&
              values[array.when.field] === array.when.equals),
        );
  const entries: Entry[] = [];
  const payload: FormValues = {};
  const arrayPayload: AIArrayValues = {};
  const key = (...ids: string[]) => JSON.stringify(ids);
  const elementId = (value: string) => `${prefix}-${encodeURIComponent(value)}`;
  for (const field of activeFields) {
    const value = values[field.id] ?? (field.type === 'checkbox' ? false : '');
    entries.push({ key: key(field.id), field, value, group: field.id });
    payload[field.id] = value;
  }
  for (const array of activeArrays) {
    arrayPayload[array.id] = (arrayValues[array.id] ?? []).map((row) => {
      const normalized: FormValues = {};
      for (const field of visibleFields(array.fields, row.values)) {
        const value = row.values[field.id] ?? (field.type === 'checkbox' ? false : '');
        normalized[field.id] = value;
        entries.push({
          key: key(array.id, row.id, field.id),
          field,
          value,
          group: array.id,
          array: array.id,
          row: row.id,
        });
      }
      return { id: row.id, values: normalized };
    });
  }
  const currentGroups = steps?.[currentIndex]?.fieldIds;
  const shownEntries = currentGroups
    ? entries.filter((entry) => currentGroups.includes(entry.group))
    : entries;
  const shownArrays = currentGroups
    ? activeArrays.filter((array) => currentGroups.includes(array.id))
    : activeArrays;
  const shownFields = shownEntries.filter((entry) => !entry.array);
  const focus = (target: string) => form.current?.ownerDocument.getElementById(target)?.focus();
  useEffect(() => {
    const request = focusRequest.current;
    if (!request) return;
    if (request.scope !== scope || hidden) {
      focusRequest.current = undefined;
      return;
    }
    if (step === request.step && !locked) {
      focus(request.key ? elementId(request.key) : `${prefix}-step-title`);
      focusRequest.current = undefined;
    }
  });
  useEffect(() => {
    const request = rowFocus.current;
    if (!request) return;
    if (request.scope !== scope || hidden || schemaError || valueError) {
      rowFocus.current = undefined;
      return;
    }
    if (locked) return;
    const rows = arrayValues[request.array] ?? [];
    const added = rows.find((row) => !request.ids.includes(row.id));
    if (
      (request.type === 'add' && added) ||
      (request.type === 'remove' && !rows.some((row) => row.id === request.row))
    ) {
      const target =
        request.type === 'add'
          ? added
          : rows[Math.min(request.ids.indexOf(request.row!), rows.length - 1)];
      const entry =
        target &&
        shownEntries.find((entry) => entry.array === request.array && entry.row === target.id);
      focus(entry ? elementId(entry.key) : elementId(key(request.array, 'add')));
      rowFocus.current = undefined;
    }
  });
  function currentIssue(entry: Entry) {
    const local = validation?.scope === scope ? validation.issues[entry.key] : undefined;
    const external = entry.array
      ? arrayErrors[entry.array]?.rows?.[entry.row!]?.[entry.field.id]
      : errors[entry.field.id];
    return (local && Object.is(local.value, entry.value) ? local.message : external)?.slice(
      0,
      1000,
    );
  }
  function arrayIssue(array: AIFieldArray) {
    const local = validation?.scope === scope ? validation.issues[key(array.id)] : undefined;
    return (
      local && local.value === (arrayValues[array.id] ?? []).length
        ? local.message
        : arrayErrors[array.id]?.message
    )?.slice(0, 1000);
  }
  function validate(groups?: readonly string[]) {
    const issues: Record<string, Issue> = {};
    for (const entry of entries) {
      if (groups && !groups.includes(entry.group)) continue;
      const message = fieldIssue(entry.field, entry.value);
      if (message) issues[entry.key] = { message, value: entry.value, group: entry.group };
    }
    for (const array of activeArrays) {
      if (groups && !groups.includes(array.id)) continue;
      const count = (arrayValues[array.id] ?? []).length;
      if (count < (array.minItems ?? 0) || count > (array.maxItems ?? 20))
        issues[key(array.id)] = {
          message: `Use ${array.minItems ?? 0} to ${array.maxItems ?? 20} items.`,
          value: count,
          group: array.id,
        };
    }
    setValidation({ scope, issues });
    const firstKey = Object.keys(issues)[0];
    if (!firstKey) return true;
    const targetIndex = steps?.findIndex((s) => s.fieldIds.includes(issues[firstKey]!.group)) ?? -1;
    if (steps && targetIndex >= 0 && targetIndex !== currentIndex) {
      focusRequest.current = { scope, step: steps[targetIndex]!.id, key: firstKey };
      onStepChange?.(steps[targetIndex]!.id);
    } else focus(elementId(firstKey));
    return false;
  }
  function requestStep(index: number) {
    if (locked || !steps?.[index] || !onStepChange || index === currentIndex) return;
    const prior = steps.slice(0, index).flatMap((s) => [...s.fieldIds]);
    if (index > currentIndex && !validate(prior)) return;
    focusRequest.current = { scope, step: steps[index]!.id };
    onStepChange(steps[index]!.id);
  }
  function submit() {
    if (locked || !validate()) return;
    if (arrays.length || steps || identity)
      onSubmit(payload, { identity, arrayValues: arrayPayload });
    else onSubmit(payload);
  }
  function changeArray(request: AIArrayChange) {
    if (locked || !onArrayChange) return;
    if (request.type === 'add' || request.type === 'remove')
      rowFocus.current = {
        scope,
        array: request.arrayId,
        row: request.type === 'remove' ? request.rowId : undefined,
        ids: (arrayValues[request.arrayId] ?? []).map((row) => row.id),
        type: request.type,
      };
    onArrayChange({ ...request, identity });
  }
  function renderField(entry: Entry) {
    return (
      <AIFormField
        key={entry.key}
        id={elementId(entry.key)}
        field={entry.field}
        value={entry.value}
        error={currentIssue(entry)}
        disabled={locked || Boolean(entry.array && !onArrayChange)}
        onValueChange={(next) => {
          if (locked) return;
          if (entry.array)
            changeArray({
              type: 'change',
              arrayId: entry.array,
              rowId: entry.row!,
              fieldId: entry.field.id,
              value: next,
            });
          else onValueChange({ ...values, [entry.field.id]: next });
        }}
      />
    );
  }
  const receiptMessage =
    typeof receipt === 'string'
      ? receipt
      : receipt && typeof receipt.message === 'string'
        ? receipt.message
        : undefined;
  const receiptMatches =
    typeof receipt !== 'string' &&
    receipt &&
    typeof receipt.message === 'string' &&
    sameFormIdentity(identity, receipt.identity);
  const localIssues =
    validation?.scope === scope
      ? Object.entries(validation.issues).filter(
          ([id, issue]) =>
            entries.some((entry) => entry.key === id && Object.is(entry.value, issue.value)) ||
            activeArrays.some(
              (array) =>
                key(array.id) === id && (arrayValues[array.id] ?? []).length === issue.value,
            ),
        ).length
      : 0;
  return (
    <form
      ref={form}
      className={g.root}
      data-part="ai-form"
      data-variant={variant}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (steps && currentIndex < steps.length - 1) requestStep(currentIndex + 1);
        else submit();
      }}
    >
      <strong>{title.slice(0, 1000)}</strong>
      {schemaError || valueError ? (
        <p role="alert" className={g.error}>
          {schemaError || valueError}
        </p>
      ) : hidden ? (
        <div role="status" className={s.muted}>
          {status === 'loading' ? (
            <LoadingIndicator label="Loading form" />
          ) : status === 'denied' ? (
            'Access to this form is unavailable.'
          ) : status === 'stale' ? (
            'The form changed. Reload it to get the latest version.'
          ) : (
            'This form is unavailable.'
          )}
        </div>
      ) : stepUnavailable ? (
        <p role="status" className={s.muted}>
          This step isn’t available. Choose another step.
        </p>
      ) : (
        <>
          {steps && (
            <AIFormSteps
              steps={steps}
              currentIndex={currentIndex}
              titleId={prefix + '-step-title'}
              disabled={locked || !onStepChange}
              onStepRequest={requestStep}
            />
          )}
          {shownFields.length > 0 && <div className={g.fields}>{shownFields.map(renderField)}</div>}
          {shownArrays.map((array) => (
            <AIFormArraySection
              key={array.id}
              id={elementId(key(array.id))}
              addId={elementId(key(array.id, 'add'))}
              array={array}
              rows={arrayValues[array.id] ?? []}
              error={arrayIssue(array)}
              disabled={locked || !onArrayChange}
              onArrayChange={changeArray}
              renderFields={(rowId) =>
                shownEntries
                  .filter((entry) => entry.array === array.id && entry.row === rowId)
                  .map(renderField)
              }
            />
          ))}
          {!shownFields.length && !shownArrays.length && (
            <p className={s.muted}>No fields are required in this step.</p>
          )}
        </>
      )}
      {localIssues > 0 && !hidden && !schemaError && (
        <p role="alert" className={g.error}>
          Review the highlighted fields{steps ? ' across the form steps' : ''}.
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className={g.error}>
          {errors._form?.slice(0, 1000) || 'This submission wasn’t accepted.'}
        </p>
      )}
      <div
        className={`${g.formActions} ${a.footer}`}
        role="group"
        aria-label="Form navigation and submission"
      >
        {steps && currentIndex > 0 && !hidden && (
          <Button
            variant="outline"
            disabled={locked || !onStepChange}
            onClick={() => requestStep(currentIndex - 1)}
          >
            Back
          </Button>
        )}
        <Button
          type="submit"
          disabled={locked || Boolean(steps && currentIndex < steps.length - 1 && !onStepChange)}
        >
          {status === 'pending'
            ? 'Submitting…'
            : status === 'complete'
              ? identity && !receiptMatches
                ? 'Receipt unavailable'
                : 'Submitted'
              : steps && currentIndex === steps.length - 1
                ? 'Submit'
                : steps
                  ? 'Next'
                  : 'Continue'}
        </Button>
      </div>
      {status === 'complete' && !schemaError && !valueError && (
        <p role="status" className={s.muted}>
          {identity && !receiptMatches
            ? 'The confirmation doesn’t match this version of the form.'
            : receiptMessage?.slice(0, 1000) || 'Submission confirmed.'}
        </p>
      )}
    </form>
  );
}
