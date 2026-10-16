import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ScopeGrantList } from './scope-grant-list.js';
import { DryRunPreview } from './dry-run-preview.js';
import { ApprovalBatch } from './approval-batch.js';
import { proposal } from '../../../../../apps/docs/lib/fixtures';

const now = '2026-10-16T10:00:00Z';
const meta = {
  title: 'Unseen UI/Governance',
  component: ScopeGrantList,
  args: {
    now,
    grants: [
      {
        id: 'g1',
        version: 2,
        scopes: ['accounts:read', 'accounts:archive'],
        target: 'CRM sandbox',
        grantedAt: '2026-10-16T09:00:00Z',
        grantedBy: 'Priya',
        expiresAt: '2026-10-16T12:00:00Z',
        uses: { kind: 'measured', value: 3 },
        maxUses: 10,
        status: 'active',
      },
      {
        id: 'g2',
        version: 1,
        scopes: ['mail:send'],
        target: 'Mail relay',
        grantedAt: '2026-10-15T09:00:00Z',
        status: 'revoked',
      },
    ],
    onRevoke: () => {},
  },
} satisfies Meta<typeof ScopeGrantList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Grants: Story = {};
export const Compact: Story = { args: { variant: 'compact' } };

function DryRun() {
  const [skipped, setSkipped] = useState<string[]>([]);
  return (
    <DryRunPreview
      plan={{
        id: 'plan-1',
        version: 3,
        title: 'Archive inactive accounts',
        summary: 'Three accounts and one notification.',
        effects: [
          {
            id: 'e1',
            kind: 'record',
            label: 'Archive 3 accounts',
            target: 'CRM sandbox',
            reversible: true,
          },
          {
            id: 'e2',
            kind: 'message',
            label: 'Email 3 owners',
            target: 'Mail relay',
            reversible: false,
          },
          {
            id: 'e3',
            kind: 'external',
            label: 'Post to #ops',
            target: 'Chat',
            reversible: 'unknown',
          },
        ],
      }}
      skippedIds={skipped}
      onSkippedChange={setSkipped}
      onDecision={() => {}}
    />
  );
}
export const DryRunPlan: Story = { render: () => <DryRun /> };

function Batch() {
  const [excluded, setExcluded] = useState<string[]>([]);
  return (
    <ApprovalBatch
      now={now}
      proposals={[
        { ...proposal, id: 'a', title: 'Archive Acme Sandbox' },
        { ...proposal, id: 'b', title: 'Archive Example Studio' },
        { ...proposal, id: 'c', title: 'Archive Demo Works', status: 'superseded' },
      ]}
      excludedIds={excluded}
      onExcludedChange={setExcluded}
      onDecision={() => {}}
    />
  );
}
export const BatchApproval: Story = { render: () => <Batch /> };
