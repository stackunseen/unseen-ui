import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DateRangePicker } from './date-range-picker.js';
import type { DateOnly, DateRange } from '../calendar/types.js';

function PickerExample({
  state = 'ready',
}: {
  state?: 'ready' | 'loading' | 'error' | 'disabled' | 'invalid';
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<DateOnly>('2024-02-01');
  const [value, setValue] = useState<DateRange>({ start: null, end: null });
  return (
    <DateRangePicker
      label="Report dates"
      description="Choose the inclusive reporting period. Unavailable dates cannot be included."
      locale="en-US"
      value={state === 'invalid' ? { start: '2024-02-20', end: '2024-02-10' } : value}
      onValueChange={setValue}
      month={month}
      onMonthChange={setMonth}
      open={open}
      onOpenChange={setOpen}
      min="2024-02-01"
      max="2024-05-31"
      disabledDates={['2024-02-23']}
      today="2024-02-20"
      loading={state === 'loading'}
      disabled={state === 'disabled'}
      error={state === 'error' ? 'Available dates could not be loaded.' : undefined}
    />
  );
}

const meta = {
  title: 'Unseen UI/DateRangePicker',
  component: PickerExample,
  argTypes: {
    state: { control: 'select', options: ['ready', 'loading', 'error', 'disabled', 'invalid'] },
  },
} satisfies Meta<typeof PickerExample>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ReportingPeriod: Story = {};
export const Loading: Story = { args: { state: 'loading' } };
export const Error: Story = { args: { state: 'error' } };
export const Disabled: Story = { args: { state: 'disabled' } };
export const InvalidRange: Story = { args: { state: 'invalid' } };
