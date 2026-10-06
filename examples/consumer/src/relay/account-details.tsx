import { useState } from 'react';
import { AIIcon, Button, Field, Input, Modal, Select, Textarea } from '@stackunseen/ui';
import type { Account, Health } from './data';
import { dateLabel, healthOptions, money, ownerOptions } from './data';
import s from './relay.module.css';

function AccountEditor({
  account,
  onSave,
  onCancel,
}: {
  account: Account;
  onSave: (account: Account) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(account);
  const [error, setError] = useState('');
  return (
    <form
      className={s.editor}
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.notes.trim()) {
          setError('Add a next step before saving.');
          document.getElementById(`notes-${account.id}`)?.focus();
          return;
        }
        onSave({ ...draft, notes: draft.notes.trim() });
      }}
    >
      <dl className={s.detailFacts}>
        <div>
          <dt>Annual contract</dt>
          <dd>{money(account.arr)}</dd>
        </div>
        <div>
          <dt>Last contact</dt>
          <dd>{dateLabel(account.lastContact)}, 2026</dd>
        </div>
      </dl>
      <div className={s.formPair}>
        <Field label="Account owner" id={`owner-${account.id}`}>
          <Select
            id={`owner-${account.id}`}
            aria-label="Account owner"
            value={draft.owner}
            options={ownerOptions}
            onValueChange={(owner) => setDraft({ ...draft, owner })}
          />
        </Field>
        <Field label="Account health" id={`health-${account.id}`}>
          <Select
            id={`health-${account.id}`}
            aria-label="Account health"
            value={draft.health}
            options={healthOptions}
            onValueChange={(health) => setDraft({ ...draft, health: health as Health })}
          />
        </Field>
      </div>
      <Field label="Renewal date" required>
        <Input
          type="date"
          min="2026-01-01"
          max="2029-12-31"
          value={draft.renewal}
          onChange={(event) => setDraft({ ...draft, renewal: event.target.value })}
        />
      </Field>
      <Field
        label="Next step"
        id={`notes-${account.id}`}
        description="Keep it specific enough for your next conversation."
        error={error || undefined}
        required
      >
        <Textarea
          rows={4}
          value={draft.notes}
          maxLength={1200}
          onChange={(event) => {
            setDraft({ ...draft, notes: event.target.value });
            setError('');
          }}
        />
      </Field>
      <p className={s.finePrint}>Saved only in this demo session.</p>
      <div className={s.formActions}>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save changes</Button>
      </div>
    </form>
  );
}

export function AccountDetails({
  account,
  onSave,
  onSelect,
}: {
  account: Account;
  onSave: (account: Account) => void;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Modal
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) onSelect(account.id);
      }}
      title={account.name}
      description={`${account.sector} · Account details and follow-up`}
      trigger={
        <Button id={`open-${account.id}`} variant="ghost" className={s.accountName}>
          {account.name}
          <AIIcon name="external" size={10} />
        </Button>
      }
    >
      {open && (
        <AccountEditor
          account={account}
          onSave={(updated) => {
            onSave(updated);
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      )}
    </Modal>
  );
}
