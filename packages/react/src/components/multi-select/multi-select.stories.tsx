import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { AITheme } from '../../providers/theme/theme-provider.js';
import { MultiSelect } from './multi-select.js';

const meta = {
  title: 'Unseen UI/Application/MultiSelect',
  component: MultiSelect,
  decorators: [
    (Story) => (
      <AITheme>
        <Story />
      </AITheme>
    ),
  ],
  args: {
    label: 'Project teams',
    value: [],
    query: '',
    onValueChange: () => {},
    onQueryChange: () => {},
    description: 'Select several teams. Use the removal buttons to change your selection.',
    options: [
      { value: 'design', label: 'Design', description: 'Experience and research' },
      {
        value: 'engineering',
        label: 'Engineering',
        description: 'Product implementation',
        keywords: ['build'],
      },
      { value: 'operations', label: 'Operations', description: 'Support and delivery' },
      { value: 'finance', label: 'Finance', disabledReason: 'Access has not been granted' },
    ],
  },
  render: function Controlled(args) {
    const [value, setValue] = useState<readonly string[]>(args.value);
    const [query, setQuery] = useState(args.query);
    return (
      <MultiSelect
        {...args}
        value={value}
        query={query}
        onValueChange={setValue}
        onQueryChange={setQuery}
      />
    );
  },
} satisfies Meta<typeof MultiSelect>;

export default meta;
type Story = StoryObj<typeof meta>;
export const SearchAndChoose: Story = {};
export const SelectedTeams: Story = { args: { value: ['design', 'engineering'] } };
export const Loading: Story = { args: { status: 'loading', value: ['design'] } };
export const Error: Story = {
  args: { status: 'error', error: 'Teams could not be loaded. Try another search.' },
};
export const Empty: Story = { args: { options: [] } };
export const Disabled: Story = { args: { disabled: true, value: ['engineering'] } };
export const UnavailableSelection: Story = { args: { value: ['archived', 'design'] } };
