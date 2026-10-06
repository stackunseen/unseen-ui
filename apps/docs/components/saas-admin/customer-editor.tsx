import { useId } from 'react';
import { Field, Input, Select, Textarea } from '@stackunseen/ui';
import { SettingsSaveCancel } from './pattern-adapter';
import { statusOptions } from './options';
import type { FooterProps } from './editor-footer';
import type { CustomerDraft, CustomerStatus, FieldErrors } from './types';
import s from './saas-admin.module.css';

export function CustomerEditor({
  draft,
  errors,
  disabled,
  onChange,
  footer,
}: {
  draft: CustomerDraft;
  errors: FieldErrors;
  disabled: boolean;
  onChange: (draft: CustomerDraft) => void;
  footer: FooterProps;
}) {
  const formId = useId();
  return (
    <form
      id={formId}
      noValidate
      className={s.stack}
      onSubmit={(event) => {
        event.preventDefault();
        footer.onSave();
      }}
    >
      <div className={s.formGrid}>
        <Field label="Customer name" required error={errors.name}>
          <Input
            name="name"
            maxLength={100}
            value={draft.name}
            disabled={disabled}
            onChange={(event) => onChange({ ...draft, name: event.currentTarget.value })}
            autoComplete="off"
          />
        </Field>
        <Field label="Email address" required error={errors.email}>
          <Input
            name="email"
            type="email"
            maxLength={254}
            value={draft.email}
            disabled={disabled}
            onChange={(event) => onChange({ ...draft, email: event.currentTarget.value })}
            autoComplete="off"
          />
        </Field>
        <Field label="Company" required error={errors.company}>
          <Input
            name="company"
            maxLength={100}
            value={draft.company}
            disabled={disabled}
            onChange={(event) => onChange({ ...draft, company: event.currentTarget.value })}
          />
        </Field>
        <Field label="Customer status" labelAs="span" error={errors.status}>
          <Select
            aria-label="Customer status"
            aria-invalid={Boolean(errors.status) || undefined}
            value={draft.status}
            options={statusOptions}
            disabled={disabled}
            onValueChange={(value) => onChange({ ...draft, status: value as CustomerStatus })}
          />
        </Field>
      </div>
      <Field
        label="Notes"
        description="Local demo notes, up to 2,000 characters."
        error={errors.notes}
      >
        <Textarea
          name="notes"
          value={draft.notes}
          maxLength={2000}
          rows={4}
          disabled={disabled}
          onChange={(event) => onChange({ ...draft, notes: event.currentTarget.value })}
        />
      </Field>
      <SettingsSaveCancel {...footer} form={formId} saveLabel="Save customer" />
    </form>
  );
}
