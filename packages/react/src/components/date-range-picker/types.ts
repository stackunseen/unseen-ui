import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import type { CalendarLabels, DateConstraints, DateOnly, DateRange } from '../calendar/types.js';

export interface DateRangePickerLabels {
  title: string;
  placeholder: string;
  chooseEnd: (start: string) => string;
  selected: (start: string, end: string) => string;
  invalid: string;
  clear: string;
  done: string;
}

export interface DateRangePickerProps
  extends
    Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'onChange' | 'defaultValue'>,
    DateConstraints {
  value: DateRange;
  onValueChange?: (value: DateRange) => void;
  month: DateOnly;
  onMonthChange: (month: DateOnly) => void;
  /** Disclosure is host-controlled; no selection or close is assumed before acknowledgement. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
  label?: string;
  description?: ReactNode;
  labels?: Partial<DateRangePickerLabels>;
  calendarLabels?: Partial<CalendarLabels>;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  today?: DateOnly;
  disabled?: boolean;
  loading?: boolean;
  error?: ReactNode;
  triggerIcon?: ReactNode;
  dir?: 'ltr' | 'rtl';
}
