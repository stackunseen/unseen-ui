import type { Meta, StoryObj } from '@storybook/react-vite';
import { Specimen } from '../../../../../apps/docs/components/specimen';
const meta = {
  title: 'Unseen UI/ApprovalCard/States',
  component: Specimen,
  args: { name: 'ApprovalCard', variant: 'Default' },
} satisfies Meta<typeof Specimen>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Approval: Story = {};
export const LostAcknowledgement: Story = { args: { variant: 'Unknown' } };
export const ExpiredApproval: Story = { args: { variant: 'Expired' } };
export const ChangedProposal: Story = { args: { variant: 'Changed' } };
