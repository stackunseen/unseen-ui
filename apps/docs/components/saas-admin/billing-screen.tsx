import { useId } from 'react';
import { Field, Input, Select, StatusBadge } from '@stackunseen/ui';
import { PageHeader, SettingsSaveCancel } from './pattern-adapter';
import { planOptions } from './options';
import type { FooterProps } from './editor-footer';
import type { DemoBilling, DemoOrganization, FieldErrors } from './types';
import s from './saas-admin.module.css';

export function BillingScreen({
  organization,
  plan,
  seats,
  onPlan,
  onSeats,
  errors,
  disabled,
  footer,
}: {
  organization: DemoOrganization;
  plan: DemoBilling['plan'];
  seats: string;
  onPlan: (value: DemoBilling['plan']) => void;
  onSeats: (value: string) => void;
  errors: FieldErrors;
  disabled: boolean;
  footer: FooterProps;
}) {
  const formId = useId();
  return (
    <div className={s.stack}>
      <PageHeader
        headingLevel={2}
        title="Plan & billing"
        description="Explore plan settings in the local demo. No payments or subscriptions are created."
      />
      <section className={s.panel}>
        <div className={s.sectionHeader}>
          <h3>Current demo plan</h3>
          <StatusBadge state="idle" label="Sample plan" />
        </div>
        <dl className={s.facts}>
          <div>
            <dt>Plan</dt>
            <dd>
              {planOptions.find((option) => option.value === organization.billing.plan)?.label}
            </dd>
          </div>
          <div>
            <dt>Seats</dt>
            <dd>
              {organization.members.length} members / {organization.billing.seats} seats
            </dd>
          </div>
          <div>
            <dt>Payment method</dt>
            <dd>Not connected</dd>
          </div>
        </dl>
      </section>
      <form
        id={formId}
        noValidate
        className={`${s.panel} ${s.stack}`}
        onSubmit={(event) => {
          event.preventDefault();
          footer.onSave();
        }}
      >
        <h3>Change demo plan</h3>
        <div className={s.formGrid}>
          <Field label="Demo plan" labelAs="span">
            <Select
              aria-label="Demo plan"
              value={plan}
              options={planOptions}
              disabled={disabled}
              onValueChange={(value) => onPlan(value as DemoBilling['plan'])}
            />
          </Field>
          <Field
            label="Demo seats"
            required
            error={errors.seats}
            description={`At least ${organization.members.length} seats for this team; maximum 50.`}
          >
            <Input
              name="seats"
              type="number"
              inputMode="numeric"
              min={organization.members.length}
              max={50}
              step={1}
              value={seats}
              disabled={disabled}
              onChange={(event) => onSeats(event.currentTarget.value)}
            />
          </Field>
        </div>
        <SettingsSaveCancel {...footer} form={formId} saveLabel="Save demo plan" />
      </form>
      <section className={s.panel}>
        <h3>Billing history</h3>
        <p className={s.muted}>
          No transactions exist in this demo. Connect your billing host to display actual invoices.
        </p>
      </section>
    </div>
  );
}
