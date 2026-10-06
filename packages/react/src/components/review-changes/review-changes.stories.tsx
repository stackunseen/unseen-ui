import type { Meta, StoryObj } from '@storybook/react-vite';
import { ReviewChanges } from './review-changes.js';
import type { ReviewChangesContract, ReviewCommand } from './review-contract.js';

const target = { documentId: 'query', version: 'file-1' };
const changes = [
  {
    id: 'query',
    path: 'src/query.ts',
    before: 'const limit = 10;',
    after: 'const limit = 20;',
    target,
    hunks: [
      {
        id: 'limit',
        label: 'Increase result limit',
        target: { ...target, range: { from: 14, to: 16 } },
        insert: '20',
      },
    ],
  },
];
const command: ReviewCommand = {
  commandId: 'apply-1',
  target: { documentId: 'proposal', version: 'proposal-1' },
  baseVersion: 'project-1',
  proposalVersion: 'proposal-1',
  action: 'apply',
  files: [{ id: 'query', target }],
};
const review: ReviewChangesContract = {
  proposal: command.target,
  currentTargets: [target],
  access: 'allowed',
  policy: { stage: 'pending' },
  submission: { status: 'idle' },
  commands: { apply: command },
  selectedHunks: [],
  onHunkSelectionChange: () => {},
  onCommand: () => {},
  lookup: { requestId: 'lookup-1', status: 'ready', onRequest: () => {} },
};
const meta = {
  title: 'AI/ReviewChanges/Precise review',
  component: ReviewChanges,
  args: {
    changes,
    baseVersion: 'project-1',
    proposalVersion: 'proposal-1',
    selectedIds: ['query'],
    onSelectionChange: () => {},
    state: 'ready',
    onDecision: () => {},
    review,
  },
} satisfies Meta<typeof ReviewChanges>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Accordion: Story = {};
export const Stack: Story = { args: { variant: 'stack' } };
export const Compact: Story = { args: { variant: 'compact' } };
export const Pending: Story = {
  args: { variant: 'stack', review: { ...review, submission: { status: 'pending', command } } },
};
export const Unknown: Story = {
  args: { variant: 'stack', review: { ...review, submission: { status: 'unknown', command } } },
};
export const Revoked: Story = {
  args: { variant: 'stack', review: { ...review, access: 'revoked' } },
};
export const Stale: Story = {
  args: {
    variant: 'stack',
    review: { ...review, currentTargets: [{ ...target, version: 'file-2' }] },
  },
};
export const Saved: Story = {
  args: {
    variant: 'stack',
    review: {
      ...review,
      currentTargets: [{ ...target, version: 'file-2' }],
      policy: {
        stage: 'saved',
        commandId: command.commandId,
        targets: [{ ...target, version: 'file-2' }],
        undo: 'unavailable',
        reason: 'The host requires a new proposal to reverse this save.',
      },
      submission: {
        status: 'settled',
        command,
        receipt: {
          command,
          files: [{ id: 'query', target, result: 'applied', nextVersion: 'file-2' }],
        },
      },
    },
  },
};
