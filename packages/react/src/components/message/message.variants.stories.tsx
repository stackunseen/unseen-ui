import type { Meta, StoryObj } from '@storybook/react-vite';
import { componentVariants } from '@stackunseen/ui';
import { VariantGallery } from '../../../../../.storybook/fixtures/variant-gallery';
const meta = {
  title: 'Unseen UI/Message/Variants',
  component: VariantGallery,
  args: { name: 'Message' },
  argTypes: {
    name: { control: 'select', options: Object.keys(componentVariants) },
    dark: { control: 'boolean' },
  },
} satisfies Meta<typeof VariantGallery>;
export default meta;
type Story = StoryObj<typeof meta>;
export const RichMessages: Story = { args: { name: 'Message', state: 'Markdown' } };
export const StructuredMessages: Story = { args: { name: 'Message', state: 'Mixed parts' } };
export const LiveMessageParts: Story = { args: { name: 'Message', state: 'Live parts' } };
export const UnresolvedParts: Story = {
  args: { name: 'Message', state: 'Missing parts', dark: true },
};
export const MarkdownTables: Story = { args: { name: 'Message', state: 'Table', dark: true } };
export const CodeResponses: Story = { args: { name: 'Message', state: 'Long code' } };
