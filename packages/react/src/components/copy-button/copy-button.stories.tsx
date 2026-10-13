import type { Meta, StoryObj } from '@storybook/react-vite';
import { CopyButton } from './copy-button.js';

const meta = {
  title: 'Unseen UI/CopyButton',
  component: CopyButton,
  args: { value: 'https://unseenui.com/components/copy-button/', label: 'Copy link' },
} satisfies Meta<typeof CopyButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const IconOnly: Story = { args: { iconOnly: true, variant: 'ghost', size: 'sm' } };
export const Primary: Story = { args: { variant: 'primary', label: 'Copy install command' } };
