import type { Meta, StoryObj } from '@storybook/react-vite';
import { componentVariants } from '@stackunseen/ui';
import { VariantGallery } from '../../../../../.storybook/fixtures/variant-gallery';
const meta = {
  title: 'Unseen UI/ApprovalCard/Variants',
  component: VariantGallery,
  args: { name: 'ApprovalCard' },
  argTypes: {
    name: { control: 'select', options: Object.keys(componentVariants) },
    dark: { control: 'boolean' },
  },
} satisfies Meta<typeof VariantGallery>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Approval: Story = { args: { name: 'ApprovalCard' } };
