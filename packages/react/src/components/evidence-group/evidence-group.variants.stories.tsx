import type { Meta, StoryObj } from '@storybook/react-vite';
import { componentVariants } from '@stackunseen/ui';
import { VariantGallery } from '../../../../../.storybook/fixtures/variant-gallery';
const meta = {
  title: 'Unseen UI/EvidenceGroup/Variants',
  component: VariantGallery,
  args: { name: 'EvidenceGroup' },
  argTypes: {
    name: { control: 'select', options: Object.keys(componentVariants) },
    dark: { control: 'boolean' },
  },
} satisfies Meta<typeof VariantGallery>;
export default meta;
type Story = StoryObj<typeof meta>;
export const DarkSources: Story = { args: { name: 'EvidenceGroup', dark: true } };
