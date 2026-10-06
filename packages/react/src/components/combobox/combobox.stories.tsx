import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { AITheme } from '../../providers/theme/theme-provider.js';
import { Combobox } from './combobox.js';

const meta = {
  title: 'Unseen UI/Application/Combobox',
  component: Combobox,
  decorators: [
    (Story) => (
      <AITheme>
        <Story />
      </AITheme>
    ),
  ],
  args: {
    label: 'Workspace',
    value: null,
    query: '',
    onValueChange: () => {},
    onQueryChange: () => {},
    description: 'Choose a workspace. Search matches names and descriptions.',
    options: [
      {
        value: 'product',
        label: 'Product',
        description: 'Design and product planning',
        keywords: ['design'],
      },
      { value: 'engineering', label: 'Engineering', description: 'Implementation and delivery' },
      { value: 'finance', label: 'Finance', disabledReason: 'Access has not been granted' },
    ],
  },
  render: function Controlled(args) {
    const [value, setValue] = useState(args.value);
    const [query, setQuery] = useState(args.query);
    return (
      <Combobox
        {...args}
        value={value}
        query={query}
        onQueryChange={setQuery}
        onValueChange={(next) => {
          setValue(next);
          setQuery('');
        }}
      />
    );
  },
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;
export const SearchAndChoose: Story = {};
export const Selected: Story = { args: { value: 'engineering' } };
export const Loading: Story = { args: { status: 'loading' } };
export const Error: Story = {
  args: { status: 'error', error: 'Workspaces could not be loaded. Try another search.' },
};
export const Empty: Story = { args: { options: [] } };
export const Disabled: Story = { args: { disabled: true, value: 'product' } };
export const UnavailableSelection: Story = { args: { value: 'archived' } };
export const HostFiltered: Story = { args: { query: 'server-ranked search', filterOption: false } };
