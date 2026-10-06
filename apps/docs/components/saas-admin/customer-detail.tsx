import { Button, StatusBadge } from '@stackunseen/ui';
import type { Customer } from './types';
import s from './saas-admin.module.css';

export function CustomerDetail({
  customer,
  onEdit,
  onDelete,
  onBack,
  disabled,
}: {
  customer: Customer;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
  disabled: boolean;
}) {
  return (
    <div className={s.stack}>
      <div className={s.sectionHeader}>
        <Button variant="ghost" size="sm" onClick={onBack} disabled={disabled}>
          Back to customers
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit} disabled={disabled}>
          Edit customer
        </Button>
      </div>
      <h3>{customer.name}</h3>
      <p className={s.muted}>{customer.company}</p>
      <dl className={s.facts}>
        <div>
          <dt>Email</dt>
          <dd>{customer.email}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <StatusBadge
              state={
                customer.status === 'active'
                  ? 'succeeded'
                  : customer.status === 'trial'
                    ? 'pending'
                    : 'paused'
              }
              label={customer.status}
            />
          </dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>
            <time dateTime={customer.created}>{customer.created}</time>
          </dd>
        </div>
        <div>
          <dt>Saved version</dt>
          <dd>{customer.version}</dd>
        </div>
      </dl>
      <section>
        <h4>Notes</h4>
        <p className={s.notes}>{customer.notes || 'No notes added.'}</p>
      </section>
      <Button variant="danger" size="sm" onClick={onDelete} disabled={disabled}>
        Delete demo customer
      </Button>
    </div>
  );
}
