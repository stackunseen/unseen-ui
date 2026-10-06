import type { CalendarLabels } from './types.js';

export const calendarLabels: CalendarLabels = {
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  loading: 'Loading dates…',
  empty: 'No available dates in this month.',
  invalid: 'Calendar unavailable. Check the dates, bounds and locale.',
  rangeBlocked: 'This range includes an unavailable date. Choose another end date.',
  instructions:
    'Use arrow keys to move by day or week, Home/End within a week, and Page Up/Down to change month. Hold Shift with Page Up/Down to change year. Press Enter or Space to select.',
  startDate: 'Start date',
  endDate: 'End date',
  selectedDate: 'Selected date',
  noSelection: 'No date selected.',
  selected: (date) => `Selected: ${date}.`,
  rangeStarted: (start) => `Start: ${start}. Choose an end date.`,
  rangeSelected: (start, end) => `Selected range: ${start} to ${end}.`,
};
