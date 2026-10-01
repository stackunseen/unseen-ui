import { z } from 'zod';

export interface AIField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox';
  required?: boolean;
  description?: string;
  options?: readonly { value: string; label: string; disabled?: boolean }[];
  min?: number;
  max?: number;
  when?: { field: string; equals: string | boolean };
}
export type FormValues = Record<string, string | boolean>;
export interface AIFieldArray {
  id: string;
  label: string;
  description?: string;
  fields: readonly AIField[];
  minItems?: number;
  maxItems?: number;
  when?: AIField['when'];
  reorderable?: boolean;
}
export interface AIFormRow {
  id: string;
  values: FormValues;
}
export type AIArrayValues = Record<string, readonly AIFormRow[]>;
export interface AIFormStep {
  id: string;
  title: string;
  description?: string;
  fieldIds: readonly string[];
}
export interface AIFormIdentity {
  formId: string;
  schemaVersion: string;
  draftVersion?: string;
}
export type AIArrayChange = (
  | { type: 'add'; arrayId: string }
  | { type: 'remove'; arrayId: string; rowId: string }
  | { type: 'move'; arrayId: string; rowId: string; toIndex: number }
  | { type: 'change'; arrayId: string; rowId: string; fieldId: string; value: string | boolean }
) & { identity?: AIFormIdentity };
export interface AIFormSubmission {
  identity?: AIFormIdentity;
  arrayValues: AIArrayValues;
}
export interface AIFormReceipt {
  identity: AIFormIdentity;
  message: string;
  submissionId?: string;
}
export type AIArrayErrors = Record<
  string,
  { message?: string; rows?: Record<string, Record<string, string>> }
>;

const identifier = z
  .string()
  .max(80)
  .refine(
    (value) => Boolean(value.trim()) && !['__proto__', 'constructor', 'prototype'].includes(value),
  );
const text = z
  .string()
  .min(1)
  .max(1000)
  .refine((value) => Boolean(value.trim()));
const condition = z
  .object({ field: identifier, equals: z.union([z.string().max(10000), z.boolean()]) })
  .strict();
export const fieldSchema = z
  .object({
    id: identifier,
    label: text,
    type: z.enum(['text', 'textarea', 'number', 'select', 'checkbox']),
    required: z.boolean().optional(),
    description: z.string().max(2000).optional(),
    options: z
      .array(
        z
          .object({
            value: z.string().min(1).max(10000),
            label: text,
            disabled: z.boolean().optional(),
          })
          .strict(),
      )
      .max(100)
      .optional(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    when: condition.optional(),
  })
  .strict()
  .refine((field) => field.min === undefined || field.max === undefined || field.min <= field.max)
  .refine(
    (field) =>
      field.type !== 'select' ||
      Boolean(
        field.options?.length &&
        new Set(field.options.map((o) => o.value)).size === field.options.length,
      ),
  );
export const arraySchema = z
  .object({
    id: identifier,
    label: text,
    description: z.string().max(2000).optional(),
    fields: z.array(fieldSchema).min(1).max(50),
    minItems: z.number().int().min(0).max(20).optional(),
    maxItems: z.number().int().min(1).max(20).optional(),
    when: condition.optional(),
    reorderable: z.boolean().optional(),
  })
  .strict()
  .refine((array) => (array.minItems ?? 0) <= (array.maxItems ?? 20));
export const stepSchema = z
  .object({
    id: identifier,
    title: text,
    description: z.string().max(2000).optional(),
    fieldIds: z.array(identifier).max(50),
  })
  .strict();
const identitySchema = z
  .object({ formId: identifier, schemaVersion: identifier, draftVersion: identifier.optional() })
  .strict();
function validDependencies(fields: readonly AIField[]) {
  const byId = new Map(fields.map((field) => [field.id, field]));
  if (byId.size !== fields.length) return false;
  for (const field of fields) {
    const visited = new Set<string>([field.id]);
    let current = field;
    while (current.when) {
      const dependency = byId.get(current.when.field);
      if (
        !dependency ||
        visited.has(dependency.id) ||
        (dependency.type === 'checkbox') !== (typeof current.when.equals === 'boolean')
      )
        return false;
      visited.add(dependency.id);
      current = dependency;
    }
  }
  return true;
}
export function inspectFormSchema(
  fields: readonly AIField[],
  arrays: readonly AIFieldArray[],
  steps: readonly AIFormStep[] | undefined,
  identity: AIFormIdentity | undefined,
): string | undefined {
  if ((arrays?.length || steps) && !identity)
    return 'Repeatable and multistep forms require a form identity and schema version.';
  const error = 'This form schema is unsupported or exceeds the field limit.';
  if (
    !Array.isArray(fields) ||
    !Array.isArray(arrays) ||
    fields.length > 50 ||
    arrays.length > 10 ||
    arrays.some((array) => !Array.isArray(array?.fields) || array.fields.length > 50) ||
    fields.length + arrays.reduce((sum, array) => sum + array.fields.length, 0) > 50
  )
    return error;
  if (
    !z.array(fieldSchema).safeParse(fields).success ||
    !z.array(arraySchema).safeParse(arrays).success ||
    !validDependencies(fields) ||
    arrays.some((array) => !validDependencies(array.fields))
  )
    return error;
  const groups = new Set([...fields.map((f) => f.id), ...arrays.map((a) => a.id)]);
  if (
    groups.size !== fields.length + arrays.length ||
    arrays.some(
      (array) =>
        array.when &&
        !fields.some(
          (field) =>
            field.id === array.when!.field &&
            (field.type === 'checkbox') === (typeof array.when!.equals === 'boolean'),
        ),
    )
  )
    return error;
  if (identity !== undefined && !identitySchema.safeParse(identity).success) return error;
  if (steps !== undefined) {
    if (
      !Array.isArray(steps) ||
      steps.length < 1 ||
      steps.length > 10 ||
      !z.array(stepSchema).safeParse(steps).success ||
      new Set(steps.map((s) => s.id)).size !== steps.length
    )
      return error;
    const assigned = steps.flatMap((s) => [...s.fieldIds]);
    if (
      assigned.length !== groups.size ||
      new Set(assigned).size !== assigned.length ||
      assigned.some((id) => !groups.has(id))
    )
      return error;
  }
}
export function visibleFields(fields: readonly AIField[], values: FormValues) {
  const byId = new Map(fields.map((field) => [field.id, field]));
  function active(field: AIField): boolean {
    if (!field.when) return true;
    const parent = byId.get(field.when.field);
    return Boolean(parent && active(parent) && values[parent.id] === field.when.equals);
  }
  return fields.filter(active);
}
export function sameFormIdentity(a: AIFormIdentity | undefined, b: AIFormIdentity | undefined) {
  return (
    a?.formId === b?.formId &&
    a?.schemaVersion === b?.schemaVersion &&
    a?.draftVersion === b?.draftVersion
  );
}
export function fieldIssue(field: AIField, value: unknown): string | undefined {
  if (typeof value !== (field.type === 'checkbox' ? 'boolean' : 'string'))
    return field.type === 'checkbox'
      ? 'Choose a checked or unchecked value.'
      : 'Enter a text value.';
  if (field.required && (field.type === 'checkbox' ? value !== true : !String(value).trim()))
    return 'This field is required.';
  if (String(value).length > 10000) return 'Use 10,000 characters or fewer.';
  if (
    field.type === 'select' &&
    value &&
    !field.options?.some((option) => option.value === value && !option.disabled)
  )
    return 'Select an available option.';
  if (field.type === 'number' && String(value).trim()) {
    const number = Number(value);
    if (
      !Number.isFinite(number) ||
      (field.min !== undefined && number < field.min) ||
      (field.max !== undefined && number > field.max)
    )
      return 'Enter a number within the allowed range.';
  }
}
export function inspectArrayValues(
  arrays: readonly AIFieldArray[],
  values: AIArrayValues,
  flatCount = 0,
) {
  if (!values || typeof values !== 'object' || Array.isArray(values))
    return 'Repeated field values are invalid.';
  let count = flatCount;
  for (const array of arrays) {
    const rows = values[array.id] ?? [];
    if (!Array.isArray(rows) || rows.length > 20)
      return 'Repeated fields require at most 20 rows with unique stable IDs.';
    count += rows.length * array.fields.length;
    if (
      count > 200 ||
      rows.some(
        (row) =>
          !row ||
          !identifier.safeParse(row.id).success ||
          !row.values ||
          typeof row.values !== 'object' ||
          Array.isArray(row.values),
      ) ||
      new Set(rows.map((row) => row.id)).size !== rows.length
    )
      return 'Repeated fields are invalid or exceed the 200-control limit.';
  }
}
