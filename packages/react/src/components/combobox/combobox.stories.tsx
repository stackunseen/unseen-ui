import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { AITheme } from '../../providers/theme/theme-provider.js';
import { Combobox } from './combobox.js';
import type { SingleComboboxProps } from './types.js';

/** The single-value form, typed for Storybook args. */
function SingleCombobox(props: SingleComboboxProps) {
  return <Combobox {...props} />;
}

const meta = {
  title: 'Unseen UI/Application/Combobox',
  component: SingleCombobox,
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
      <SingleCombobox
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
} satisfies Meta<typeof SingleCombobox>;

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

function MultipleExample() {
  const [value, setValue] = useState<readonly string[]>(['product']);
  const [query, setQuery] = useState('');
  return (
    <Combobox
      type="multiple"
      label="Workspaces"
      value={value}
      onValueChange={setValue}
      query={query}
      onQueryChange={setQuery}
      options={meta.args.options}
    />
  );
}
export const Multiple: Story = { render: () => <MultipleExample /> };
