import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Calendar } from './calendar.js';
import type { DateOnly, DateRange } from './types.js';

interface ExampleProps {
  state?: 'ready' | 'loading' | 'empty' | 'error' | 'disabled';
  range?: boolean;
  locale?: string;
}
function CalendarExample({ state = 'ready', range = false, locale = 'en-US' }: ExampleProps) {
  const [month, setMonth] = useState<DateOnly>('2024-02-01');
  const [date, setDate] = useState<DateOnly | null>('2024-02-15');
  const [dates, setDates] = useState<DateRange>({ start: '2024-02-15', end: '2024-02-18' });
  const shared = {
    month,
    onMonthChange: setMonth,
    locale,
    today: '2024-02-20' as DateOnly,
    min: state === 'empty' ? ('2024-03-01' as DateOnly) : ('2024-02-01' as DateOnly),
    max: '2024-05-31' as DateOnly,
    disabledDates: ['2024-02-23' as DateOnly],
    disabled: state === 'disabled',
    loading: state === 'loading',
    error:
      state === 'error'
        ? 'Available dates could not be loaded. Try again in your application.'
        : undefined,
  };
  const selectedDate = state === 'empty' ? null : date;
  const selectedRange = state === 'empty' ? { start: null, end: null } : dates;
  return range ? (
    <Calendar
      {...shared}
      mode="range"
      value={selectedRange}
      onValueChange={setDates}
      label="Reporting period"
    />
  ) : (
    <Calendar {...shared} value={selectedDate} onValueChange={setDate} label="Appointment date" />
  );
}

const meta = {
  title: 'Unseen UI/Calendar',
  component: CalendarExample,
  argTypes: {
    state: { control: 'select', options: ['ready', 'loading', 'empty', 'error', 'disabled'] },
  },
} satisfies Meta<typeof CalendarExample>;
export default meta;
type Story = StoryObj<typeof meta>;
export const SingleDate: Story = {};
export const Range: Story = { args: { range: true } };
export const Loading: Story = { args: { state: 'loading' } };
export const EmptyMonth: Story = { args: { state: 'empty' } };
export const Error: Story = { args: { state: 'error' } };
export const Disabled: Story = { args: { state: 'disabled' } };
export const GermanLocale: Story = { args: { locale: 'de-DE' } };
