import { Field, Select } from '@stackunseen/ui';
import { SettingsSaveCancel } from './pattern-adapter';
import { roleOptions } from './options';
import type { FooterProps } from './editor-footer';
import type { DemoRole, Member } from './types';
import s from './saas-admin.module.css';

export function RoleEditor({
  member,
  role,
  onChange,
  disabled,
  footer,
}: {
  member: Member;
  role: DemoRole;
  onChange: (value: DemoRole) => void;
  disabled: boolean;
  footer: FooterProps;
}) {
  return (
    <div className={s.stack}>
      <h3>Edit {member.name}’s role</h3>
      <Field label="Demo role" labelAs="span">
        <Select
          aria-label="Demo role"
          value={role}
          options={roleOptions}
          disabled={disabled}
          onValueChange={(value) => onChange(value as DemoRole)}
        />
      </Field>
      <SettingsSaveCancel {...footer} saveLabel="Save demo role" />
    </div>
  );
}
