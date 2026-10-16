import { Button } from '@stackunseen/ui';
import { PageHeader } from './pattern-adapter';
import { CustomerTable } from './customer-table-adapter';
import { statusOptions } from './options';
import type { DemoOrganization } from './types';
import s from './saas-admin.module.css';

export function OverviewScreen({
  organization,
  onCustomers,
  onCustomer,
  onMembers,
  onBilling,
}: {
  organization: DemoOrganization;
  onCustomers: () => void;
  onCustomer: (id: string) => void;
  onMembers: () => void;
  onBilling: () => void;
}) {
  const active = organization.customers.filter((customer) => customer.status === 'active').length;
  const trial = organization.customers.filter((customer) => customer.status === 'trial').length;
  return (
    <div className={s.stack}>
      <PageHeader
        headingLevel={2}
        title="Overview"
        description={`A working view of ${organization.settings.name}.`}
        actions={<Button onClick={onCustomers}>View customers</Button>}
      />
      <dl className={s.metrics}>
        <div>
          <dt>Total customers</dt>
          <dd>
            <strong className={s.metricValue}>{organization.customers.length}</strong>
            <p>Saved in this demo organization</p>
          </dd>
        </div>
        <div>
          <dt>Active customers</dt>
          <dd>
            <strong className={s.metricValue}>{active}</strong>
            <p>{trial} currently in trial</p>
          </dd>
        </div>
        <div>
          <dt>Team members</dt>
          <dd>
            <strong className={s.metricValue}>{organization.members.length}</strong>
            <Button variant="ghost" size="sm" onClick={onMembers}>
              Manage members
            </Button>
          </dd>
        </div>
        <div>
          <dt>Available seats</dt>
          <dd>
            <strong className={s.metricValue}>
              {organization.billing.seats - organization.members.length}
            </strong>
            <Button variant="ghost" size="sm" onClick={onBilling}>
              View demo plan
            </Button>
          </dd>
        </div>
      </dl>
      <section className={s.panel}>
        <div className={s.sectionHeader}>
          <h3>Recent customers</h3>
          <Button variant="ghost" size="sm" onClick={onCustomers}>
            View all
          </Button>
        </div>
        <CustomerTable
          caption="Recent customers"
          captionVisibility="hidden"
          customers={[...organization.customers]
            .sort((a, b) => b.created.localeCompare(a.created))
            .slice(0, 4)}
          onSelect={onCustomer}
        />
      </section>
      <section className={s.panel}>
        <h3>Customer health</h3>
        <p className={s.muted}>Counts come from the current local records.</p>
        <ul className={s.health}>
          {statusOptions.map((option) => (
            <li key={option.value}>
              <span>{option.label}</span>
              <strong>
                {
                  organization.customers.filter((customer) => customer.status === option.value)
                    .length
                }
              </strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
