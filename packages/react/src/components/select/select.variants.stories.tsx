import type { Meta, StoryObj } from '@storybook/react-vite';
import { componentVariants } from '@ai-interaction/react';
import { VariantGallery } from '../../../../../.storybook/fixtures/variant-gallery';
const meta = {
  title: 'Unseen UI/Select/Variants',
  component: VariantGallery,
  args: { name: 'Select' },
  argTypes: {
    name: { control: 'select', options: Object.keys(componentVariants) },
    dark: { control: 'boolean' },
  },
} satisfies Meta<typeof VariantGallery>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Selects: Story = { args: { name: 'Select' } };
