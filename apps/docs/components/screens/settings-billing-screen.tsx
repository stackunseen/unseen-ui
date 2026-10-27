'use client';
import { useState } from 'react';
import {
  Button,
  CopyButton,
  Field,
  Input,
  Modal,
  Select,
  StatusBadge,
  Switch,
  Tabs,
  UsageMeter,
} from '@stackunseen/ui';
import { ModelSelector } from '@stackunseen/ui/assistant';
import '@stackunseen/ui/assistant.css';
import { DataGrid, PageHeader, SettingsSaveCancel } from '@stackunseen/ui/application';
import type { DataGridColumn, SettingsSaveState } from '@stackunseen/ui/application';
import s from './screens.module.css';

interface General {
  name: string;
  region: string;
  model: string;
  retention: string;
  training: boolean;
}
const initial: General = { name: 'Larkspur Outdoors', region: 'eu', model: 'sonnet', retention: '30', training: false };
const models = [
  { id: 'opus', name: 'Opus 5.5', provider: 'Anthropic', description: 'Most capable; use for approvals and refunds.' },
  { id: 'sonnet', name: 'Sonnet 5.5', provider: 'Anthropic', description: 'The default for support and translation.' },
  { id: 'haiku', name: 'Haiku 5.5', provider: 'Anthropic', description: 'Fast and cheap; batch jobs.' },
];
interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created: string;
  lastUsed: string;
  state: 'succeeded' | 'idle';
}
const initialKeys: ApiKey[] = [
  { id: 'k1', name: 'Production', prefix: 'lk_live_7f3a…', created: '2026-08-02', lastUsed: '2 minutes ago', state: 'succeeded' },
  { id: 'k2', name: 'Staging', prefix: 'lk_test_c1d9…', created: '2026-09-15', lastUsed: 'Yesterday', state: 'succeeded' },
  { id: 'k3', name: 'Old CI runner', prefix: 'lk_live_02b4…', created: '2026-03-20', lastUsed: 'Never', state: 'idle' },
];
interface Invoice {
  id: string;
  period: string;
  amount: string;
  state: 'succeeded' | 'pending' | 'failed';
}
const invoices: Invoice[] = [
  { id: 'i1', period: 'October 2026', amount: '$318.40 so far', state: 'pending' },
  { id: 'i2', period: 'September 2026', amount: '$1,204.10', state: 'succeeded' },
  { id: 'i3', period: 'August 2026', amount: '$988.75', state: 'succeeded' },
  { id: 'i4', period: 'July 2026', amount: '$1,031.00', state: 'failed' },
];
const keyColumns = (onRevoke: (key: ApiKey) => void): readonly DataGridColumn<ApiKey>[] => [
  { id: 'name', header: 'Name', rowHeader: true, cell: (row) => row.name },
  { id: 'prefix', header: 'Key', cell: (row) => <code>{row.prefix}</code> },
  { id: 'created', header: 'Created', cell: (row) => row.created },
  { id: 'lastUsed', header: 'Last used', cell: (row) => row.lastUsed },
  {
    id: 'revoke',
    header: 'Actions',
    cell: (row) => (
      <Button size="sm" variant="ghost" onClick={() => onRevoke(row)}>
        Revoke
      </Button>
    ),
  },
];
const invoiceColumns: readonly DataGridColumn<Invoice>[] = [
  { id: 'period', header: 'Period', rowHeader: true, cell: (row) => row.period },
  { id: 'amount', header: 'Amount', align: 'end', cell: (row) => row.amount },
  {
    id: 'state',
    header: 'Status',
    cell: (row) => (
      <StatusBadge
        state={row.state}
        label={row.state === 'succeeded' ? 'Paid' : row.state === 'pending' ? 'Open' : 'Payment failed'}
      />
    ),
  },
];

/**
 * Workspace settings and billing for an agent product: general settings with a save footer,
 * model defaults and budgets, API keys that are shown once, and the plan with its usage and
 * invoices. Saves and key creation are requests; a simulated host acknowledges them.
 */
export function SettingsBillingScreen() {
  const [tab, setTab] = useState('general');
  const [saved, setSaved] = useState<General>(initial);
  const [draft, setDraft] = useState<General>(initial);
  const [save, setSave] = useState<SettingsSaveState>({ status: 'idle' });
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [newKey, setNewKey] = useState<{ name: string; secret: string } | null>(null);
  const [keyName, setKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  function commit() {
    setSave({ status: 'pending', message: 'Saving…' });
    window.setTimeout(() => {
      setSaved(draft);
      setSave({ status: 'acknowledged', message: 'Saved. The next request uses these settings.' });
    }, 800);
  }
  function createKey() {
    if (!keyName.trim()) return;
    setCreating(false);
    setNotice('Key requested; the server generates it.');
    window.setTimeout(() => {
      const id = `k${keys.length + 1}`;
      setKeys((previous) => [
        { id, name: keyName.trim(), prefix: 'lk_live_9e21…', created: '2026-10-27', lastUsed: 'Never', state: 'idle' },
        ...previous,
      ]);
      setNewKey({ name: keyName.trim(), secret: 'lk_live_9e21sample0000000000000000000000' });
      setKeyName('');
      setNotice('');
    }, 700);
  }
  const general = (
    <form
      className={s.form}
      onSubmit={(event) => {
        event.preventDefault();
        commit();
      }}
    >
      <Field label="Workspace name">
        <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      </Field>
      <Field label="Data region" description="Where conversations and memories are stored.">
        <Select
          value={draft.region}
          onValueChange={(region) => setDraft({ ...draft, region })}
          options={[
            { value: 'eu', label: 'European Union' },
            { value: 'us', label: 'United States' },
          ]}
        />
      </Field>
      <Field label="Conversation retention" description="Older conversations are deleted, including their memories.">
        <Select
          value={draft.retention}
          onValueChange={(retention) => setDraft({ ...draft, retention })}
          options={[
            { value: '7', label: '7 days' },
            { value: '30', label: '30 days' },
            { value: '365', label: '1 year' },
          ]}
        />
      </Field>
      <Switch
        label="Allow the provider to train on this workspace’s data"
        checked={draft.training}
        onCheckedChange={(training) => setDraft({ ...draft, training })}
      />
      <SettingsSaveCancel
        dirty={dirty}
        state={save}
        onSave={commit}
        onCancel={() => {
          setDraft(saved);
          setSave({ status: 'idle' });
        }}
      />
    </form>
  );
  const modelsTab = (
    <div className={s.form}>
      <Field label="Default model" description="Agents can override it per run; the budget still applies.">
        <ModelSelector models={models} value={draft.model} onValueChange={(model) => setDraft({ ...draft, model })} />
      </Field>
      <div className={s.meters}>
        <UsageMeter
          variant="detail"
          label="Monthly token budget"
          value={{ kind: 'measured', value: { used: 41_200_000, limit: 60_000_000 }, at: '2026-10-27T08:00:00Z' }}
        />
        <UsageMeter
          variant="detail"
          label="Monthly spend cap"
          unit="currency"
          value={{ kind: 'measured', value: { used: 318.4, limit: 500 }, at: '2026-10-27T08:00:00Z' }}
        />
        <UsageMeter
          variant="detail"
          label="Eval spend"
          unit="currency"
          value={{ kind: 'estimated', value: { used: 28.9, limit: 100 }, basis: 'token price list' }}
        />
      </div>
      <SettingsSaveCancel
        dirty={dirty}
        state={save}
        onSave={commit}
        onCancel={() => {
          setDraft(saved);
          setSave({ status: 'idle' });
        }}
      />
    </div>
  );
  const keysTab = (
    <div className={s.screen}>
      <div className={s.keyRow}>
        <Button size="sm" onClick={() => setCreating(true)}>
          Create key
        </Button>
        <span className={s.note}>A key is shown once, when it is created. Revoking takes effect within a minute.</span>
      </div>
      <DataGrid
        caption="API keys"
        columns={keyColumns((key) => {
          setKeys((previous) => previous.filter((item) => item.id !== key.id));
          setNotice(`Revocation of “${key.name}” requested; the server confirms within a minute.`);
        })}
        rows={keys}
        getRowId={(row) => row.id}
      />
      <Modal
        open={creating}
        onOpenChange={setCreating}
        title="Create an API key"
        description="Name it after the system that will use it."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={createKey} disabled={!keyName.trim()}>
              Create key
            </Button>
          </>
        }
      >
        <Field label="Key name">
          <Input value={keyName} onChange={(event) => setKeyName(event.target.value)} autoFocus />
        </Field>
      </Modal>
      <Modal
        open={newKey !== null}
        onOpenChange={(open) => !open && setNewKey(null)}
        title="Copy your new key"
        description="This is the only time it is shown."
        footer={
          <Button onClick={() => setNewKey(null)}>I have copied it</Button>
        }
      >
        {newKey && (
          <div className={s.keyRow}>
            <code className={s.secret}>{newKey.secret}</code>
            <CopyButton size="sm" variant="outline" value={newKey.secret} label="Copy key" />
          </div>
        )}
      </Modal>
    </div>
  );
  const billingTab = (
    <div className={s.screen}>
      <div className={s.plans}>
        {[
          { id: 'starter', name: 'Starter', price: '$0', lines: ['1 agent', '500k tokens a month', 'Community support'] },
          { id: 'team', name: 'Team', price: '$249 / month', lines: ['Unlimited agents', '60M tokens a month', 'Approvals and audit log'], current: true },
          { id: 'enterprise', name: 'Enterprise', price: 'Talk to us', lines: ['Dedicated region', 'SSO and SCIM', 'Custom retention'] },
        ].map((plan) => (
          <div key={plan.id} className={s.plan} data-current={plan.current ? 'true' : undefined}>
            <strong>{plan.name}</strong>
            <span className={s.price}>{plan.price}</span>
            <ul>
              {plan.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {plan.current ? (
              <StatusBadge state="succeeded" label="Current plan" />
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setNotice(`Plan change to ${plan.name} requested; billing confirms by email.`)}
              >
                {plan.id === 'enterprise' ? 'Contact sales' : 'Switch'}
              </Button>
            )}
          </div>
        ))}
      </div>
      <div className={s.meters}>
        <UsageMeter
          variant="detail"
          label="Seats"
          unit="count"
          value={{ kind: 'measured', value: { used: 14, limit: 20 }, at: '2026-10-27T08:00:00Z' }}
        />
        <UsageMeter
          variant="detail"
          label="Tokens this month"
          value={{ kind: 'measured', value: { used: 41_200_000, limit: 60_000_000 }, at: '2026-10-27T08:00:00Z' }}
        />
      </div>
      <DataGrid caption="Invoices" columns={invoiceColumns} rows={invoices} getRowId={(row) => row.id} />
    </div>
  );
  return (
    <div className={s.screen} data-template="settings-billing">
      <PageHeader
        headingLevel={2}
        title="Settings and billing"
        description="General settings, model defaults and budgets, API keys and the plan. Saving asks the server; the footer shows its answer."
      />
      <Tabs
        value={tab}
        onValueChange={setTab}
        label="Settings sections"
        items={[
          { value: 'general', label: 'General', content: general },
          { value: 'models', label: 'Models and limits', content: modelsTab },
          { value: 'keys', label: 'API keys', content: keysTab },
          { value: 'billing', label: 'Billing', content: billingTab },
        ]}
      />
      <p className={s.status} role="status">
        {notice}
      </p>
    </div>
  );
}
