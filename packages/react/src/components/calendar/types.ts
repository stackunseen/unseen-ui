import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/** Gregorian date without a time or timezone. Runtime validation requires YYYY-MM-DD. */
export type DateOnly = `${number}-${number}-${number}`;

export interface DateRange {
  start: DateOnly | null;
  end: DateOnly | null;
}

export interface DateConstraints {
  min?: DateOnly;
  max?: DateOnly;
  disabledDates?: readonly DateOnly[];
}

export interface CalendarLabels {
  previousMonth: string;
  nextMonth: string;
  loading: string;
  empty: string;
  invalid: string;
  rangeBlocked: string;
  instructions: string;
  startDate: string;
  endDate: string;
  selectedDate: string;
  noSelection: string;
  selected: (date: string) => string;
  rangeStarted: (start: string) => string;
  rangeSelected: (start: string, end: string) => string;
}

export interface CalendarBaseProps
  extends
    Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'onChange' | 'defaultValue'>,
    DateConstraints {
  /** Any valid date in the displayed month. Requests emit that month's first day. */
  month: DateOnly;
  onMonthChange: (month: DateOnly) => void;
  /** Required locale formats dates/weekdays; use labels to translate interface text. */
  locale: string;
  label?: string;
  labels?: Partial<CalendarLabels>;
  /** 0 = Sunday, 1 = Monday, ... 6 = Saturday. Defaults to Monday. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Supplied by the host to avoid implicit clock/timezone and hydration differences. */
  today?: DateOnly;
  disabled?: boolean;
  loading?: boolean;
  error?: ReactNode;
  previousIcon?: ReactNode;
  nextIcon?: ReactNode;
  dir?: 'ltr' | 'rtl';
}

export type CalendarProps = CalendarBaseProps &
  (
    | {
        mode?: 'single';
        value: DateOnly | null;
        /** An intent only; selection changes when the host updates value. */
        onValueChange?: (value: DateOnly) => void;
      }
    | {
        mode: 'range';
        value: DateRange;
        /** Earlier second dates restart selection; blocked interior dates reject completion. */
        onValueChange?: (value: DateRange) => void;
      }
  );
