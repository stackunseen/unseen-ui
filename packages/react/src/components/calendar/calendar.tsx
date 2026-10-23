'use client';
import { forwardRef, useId, useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { CalendarGrid } from './calendar-grid.js';
import { CalendarHeader } from './calendar-header.js';
import {
  getDateFormatters,
  getMonthCells,
  isUnavailable,
  parseDateOnly,
  sameMonth,
  validConstraints,
  validRange,
} from './date-only.js';
import { useCalendarNavigation } from './use-calendar-navigation.js';
import { calendarLabels } from './labels.js';
import type { CalendarProps, DateOnly, DateRange } from './types.js';
import s from './calendar.module.css';

export const Calendar = forwardRef<HTMLDivElement, CalendarProps>(function Calendar(props, ref) {
  const {
    month,
    onMonthChange,
    locale,
    min,
    max,
    disabledDates,
    today,
    weekStartsOn = 1,
    disabled = false,
    loading = false,
    error,
    label = 'Calendar',
    labels: customLabels,
    previousIcon = <ChevronLeftIcon width={15} height={15} aria-hidden="true" />,
    nextIcon = <ChevronRightIcon width={15} height={15} aria-hidden="true" />,
    mode,
    value,
    onValueChange,
    className = '',
    dir,
    'aria-describedby': describedBy,
    ...rootProps
  } = props;
  const labels = { ...calendarLabels, ...customLabels };
  const id = useId();
  const format = useMemo(() => getDateFormatters(locale), [locale]);
  const constraints = { min, max, disabledDates };
  const range: DateRange = mode === 'range' ? value : { start: value, end: value };
  const valid =
    !!format &&
    !!parseDateOnly(month) &&
    validConstraints(constraints) &&
    validRange(range, constraints) &&
    (!today || !!parseDateOnly(today)) &&
    Number.isInteger(weekStartsOn) &&
    weekStartsOn >= 0 &&
    weekStartsOn <= 6;
  const blocked = disabled || loading || !!error || !valid;
  const cells = valid ? getMonthCells(month, weekStartsOn) : [];
  const available = cells.find((date) => date && !isUnavailable(date, constraints)) ?? null;
  const initial =
    range.start && valid && sameMonth(range.start, month)
      ? range.start
      : (available ?? cells.find(Boolean) ?? null);
  const navigation = useCalendarNavigation(
    month,
    initial,
    onMonthChange,
    weekStartsOn,
    dir,
    min,
    max,
  );
  const [rejection, setRejection] = useState<{
    start: DateOnly | null;
    end: DateOnly | null;
    month: DateOnly;
    candidate: DateRange;
  } | null>(null);
  const rejected =
    rejection &&
    rejection.start === range.start &&
    rejection.end === range.end &&
    rejection.month === month &&
    !validRange(rejection.candidate, constraints);
  const selectedSummary = !valid
    ? labels.invalid
    : range.start
      ? mode === 'range'
        ? range.end
          ? labels.rangeSelected(format!.full(range.start), format!.full(range.end))
          : labels.rangeStarted(format!.full(range.start))
        : labels.selected(format!.full(range.start))
      : labels.noSelection;

  function select(date: DateOnly) {
    if (blocked) return;
    if (props.mode !== 'range') {
      props.onValueChange?.(date);
      return;
    }
    const nextRange =
      !props.value.start || props.value.end || date < props.value.start
        ? { start: date, end: null }
        : { start: props.value.start, end: date };
    if (!validRange(nextRange, constraints)) {
      setRejection({ ...range, month, candidate: nextRange });
      return;
    }
    setRejection(null);
    props.onValueChange?.(nextRange);
  }

  return (
    <div
      {...rootProps}
      ref={ref}
      role="group"
      aria-label={label}
      dir={dir}
      aria-describedby={[describedBy, `${id}-status`].filter(Boolean).join(' ')}
      aria-busy={loading || undefined}
      data-part="calendar"
      className={`${s.root} ${className}`}
    >
      <CalendarHeader
        month={month}
        onMonthChange={onMonthChange}
        format={format}
        labels={labels}
        headingId={`${id}-month`}
        valid={valid}
        blocked={blocked}
        min={min}
        max={max}
        previousIcon={previousIcon}
        nextIcon={nextIcon}
      />
      <p id={`${id}-help`} className={s.srOnly}>
        {labels.instructions}
      </p>
      {loading ? (
        <div className={s.loading} aria-hidden="true">
          {Array.from({ length: 42 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      ) : (
        format &&
        cells.length > 0 && (
          <CalendarGrid
            cells={cells}
            format={format}
            navigation={navigation}
            constraints={constraints}
            range={range}
            today={today}
            weekStartsOn={weekStartsOn}
            headingId={`${id}-month`}
            descriptionId={`${id}-help`}
            blocked={blocked}
            readOnly={!onValueChange}
            rangeMode={mode === 'range'}
            startLabel={labels.startDate}
            endLabel={labels.endDate}
            selectedLabel={labels.selectedDate}
            onSelect={select}
          />
        )
      )}
      {error && (
        <div role="alert" className={s.error}>
          {error}
        </div>
      )}
      <p
        id={`${id}-status`}
        role="status"
        aria-atomic="true"
        className={`${s.status} ${!valid || rejected ? s.error : ''}`}
      >
        {loading
          ? labels.loading
          : rejected
            ? labels.rangeBlocked
            : valid && !available
              ? labels.empty
              : selectedSummary}
      </p>
    </div>
  );
});
