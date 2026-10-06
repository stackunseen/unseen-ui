import { useId } from 'react';
import { Checkbox, Field, Input } from '@stackunseen/ui';
import { PageHeader, SettingsSaveCancel } from './pattern-adapter';
import type { FooterProps } from './editor-footer';
import type { OrganizationSettings, FieldErrors } from './types';
import s from './saas-admin.module.css';

export function SettingsScreen({
  draft,
  onChange,
  errors,
  disabled,
  footer,
}: {
  draft: Omit<OrganizationSettings, 'version'>;
  onChange: (value: Omit<OrganizationSettings, 'version'>) => void;
  errors: FieldErrors;
  disabled: boolean;
  footer: FooterProps;
}) {
  const formId = useId();
  return (
    <div className={s.stack}>
      <PageHeader
        headingLevel={2}
        title="Organization settings"
        description="Update the information shown across this local workspace."
      />
      <form
        id={formId}
        className={`${s.panel} ${s.stack}`}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          footer.onSave();
        }}
      >
        <h3>Organization profile</h3>
        <div className={s.formGrid}>
          <Field label="Organization name" required error={errors.name}>
            <Input
              name="name"
              value={draft.name}
              maxLength={100}
              disabled={disabled}
              onChange={(event) => onChange({ ...draft, name: event.currentTarget.value })}
            />
          </Field>
          <Field label="Contact email" required error={errors.email}>
            <Input
              name="email"
              type="email"
              value={draft.email}
              maxLength={254}
              disabled={disabled}
              onChange={(event) => onChange({ ...draft, email: event.currentTarget.value })}
            />
          </Field>
        </div>
        <label className={s.checkRow}>
          <Checkbox
            checked={draft.weeklyDigest}
            disabled={disabled}
            onCheckedChange={(value) => onChange({ ...draft, weeklyDigest: value })}
          />
          <span>
            Weekly activity digest
            <span className={s.secondary}>Preference only. This demo sends no email.</span>
          </span>
        </label>
        <SettingsSaveCancel {...footer} form={formId} />
      </form>
    </div>
  );
}
