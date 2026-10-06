import type { ReactNode } from 'react';
import { Button } from '../button/button.js';
import { addMonths, monthEnd, monthStart } from './date-only.js';
import type { getDateFormatters } from './date-only.js';
import type { CalendarLabels, DateConstraints, DateOnly } from './types.js';
import s from './calendar.module.css';

interface CalendarHeaderProps extends Pick<DateConstraints, 'min' | 'max'> {
  month: DateOnly;
  onMonthChange: (month: DateOnly) => void;
  format: ReturnType<typeof getDateFormatters>;
  labels: CalendarLabels;
  headingId: string;
  valid: boolean;
  blocked: boolean;
  previousIcon: ReactNode;
  nextIcon: ReactNode;
}

export function CalendarHeader({
  month,
  onMonthChange,
  format,
  labels,
  headingId,
  valid,
  blocked,
  min,
  max,
  previousIcon,
  nextIcon,
}: CalendarHeaderProps) {
  const previous = valid ? addMonths(monthStart(month), -1) : null;
  const next = valid ? addMonths(monthStart(month), 1) : null;
  return (
    <div className={s.header}>
      <Button
        variant="ghost"
        className={s.navigation}
        aria-label={
          previous && format
            ? `${labels.previousMonth}: ${format.month(previous)}`
            : labels.previousMonth
        }
        disabled={blocked || !previous || !!(min && previous && monthEnd(previous) < min)}
        onClick={() => {
          if (previous) onMonthChange(previous);
        }}
      >
        <span aria-hidden="true">{previousIcon}</span>
      </Button>
      <div id={headingId} className={s.month} aria-live="polite" aria-atomic="true">
        {valid ? format!.month(month) : labels.invalid}
      </div>
      <Button
        variant="ghost"
        className={s.navigation}
        aria-label={
          next && format ? `${labels.nextMonth}: ${format.month(next)}` : labels.nextMonth
        }
        disabled={blocked || !next || !!(max && next && next > max)}
        onClick={() => {
          if (next) onMonthChange(next);
        }}
      >
        <span aria-hidden="true">{nextIcon}</span>
      </Button>
    </div>
  );
}
