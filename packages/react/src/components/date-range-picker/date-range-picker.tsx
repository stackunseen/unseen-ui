'use client';
import { forwardRef, useId, useMemo, useRef } from 'react';
import { Button } from '../button/button.js';
import { Popover } from '../popover/popover.js';
import { Calendar } from '../calendar/calendar.js';
import {
  getDateFormatters,
  parseDateOnly,
  validConstraints,
  validRange,
} from '../calendar/date-only.js';
import type { DateRangePickerLabels, DateRangePickerProps } from './types.js';
import s from './date-range-picker.module.css';

const defaultLabels: DateRangePickerLabels = {
  title: 'Choose date range',
  placeholder: 'Choose start and end dates',
  chooseEnd: (start) => `${start}. Choose the end date`,
  selected: (start, end) => `${start} – ${end}`,
  invalid: 'Date range unavailable. Check the dates, bounds and locale.',
  clear: 'Clear range',
  done: 'Done',
};

/** Controlled range selection composed with the existing themed, focus-managed Popover. */
export const DateRangePicker = forwardRef<HTMLDivElement, DateRangePickerProps>(
  function DateRangePicker(
    {
      value,
      onValueChange,
      month,
      onMonthChange,
      open,
      onOpenChange,
      locale,
      label = 'Date range',
      description,
      labels: customLabels,
      calendarLabels,
      min,
      max,
      disabledDates,
      weekStartsOn,
      today,
      disabled = false,
      loading = false,
      error,
      triggerIcon,
      className = '',
      dir,
      'aria-describedby': describedBy,
      ...rootProps
    },
    ref,
  ) {
    const id = useId();
    const content = useRef<HTMLDivElement>(null);
    const labels = { ...defaultLabels, ...customLabels };
    const format = useMemo(() => getDateFormatters(locale), [locale]);
    const valid =
      !!format &&
      !!parseDateOnly(month) &&
      validConstraints({ min, max, disabledDates }) &&
      validRange(value, { min, max, disabledDates }) &&
      (!today || !!parseDateOnly(today)) &&
      (weekStartsOn === undefined ||
        (Number.isInteger(weekStartsOn) && weekStartsOn >= 0 && weekStartsOn <= 6));
    const summary = !valid
      ? labels.invalid
      : value.start
        ? value.end
          ? labels.selected(format!.full(value.start), format!.full(value.end))
          : labels.chooseEnd(format!.full(value.start))
        : labels.placeholder;
    const hasDescription = description !== undefined && description !== null;
    const descriptions =
      [
        describedBy,
        hasDescription ? `${id}-description` : undefined,
        error ? `${id}-error` : undefined,
      ]
        .filter(Boolean)
        .join(' ') || undefined;
    return (
      <div
        {...rootProps}
        ref={ref}
        dir={dir}
        data-part="date-range-picker"
        className={`${s.root} ${className}`}
      >
        <span id={`${id}-label`} className={s.label}>
          {label}
        </span>
        <Popover open={open} onOpenChange={onOpenChange} dir={dir}>
          <Popover.Trigger asChild>
            <Button
              variant="outline"
              className={s.trigger}
              disabled={disabled}
              aria-labelledby={`${id}-label ${id}-value`}
              aria-describedby={descriptions}
              aria-invalid={!valid || !!error || undefined}
              aria-busy={loading || undefined}
            >
              {triggerIcon && (
                <span aria-hidden="true" className={s.icon}>
                  {triggerIcon}
                </span>
              )}
              <span id={`${id}-value`}>{summary}</span>
            </Button>
          </Popover.Trigger>
          <Popover.Content
            ref={content}
            title={labels.title}
            className={s.content}
            onOpenAutoFocus={(event) => {
              const day = content.current?.querySelector<HTMLButtonElement>(
                'button[data-date][tabindex="0"]:not(:disabled)',
              );
              if (day) {
                event.preventDefault();
                day.focus();
              }
            }}
          >
            <Calendar
              mode="range"
              value={value}
              onValueChange={onValueChange}
              month={month}
              onMonthChange={onMonthChange}
              locale={locale}
              label={label}
              labels={calendarLabels}
              min={min}
              max={max}
              disabledDates={disabledDates}
              weekStartsOn={weekStartsOn}
              today={today}
              disabled={disabled}
              loading={loading}
              error={error ? <span id={`${id}-error`}>{error}</span> : undefined}
              dir={dir}
            />
            <div className={s.actions}>
              <Button
                variant="ghost"
                disabled={disabled || loading || !onValueChange || (!value.start && !value.end)}
                onClick={() => onValueChange?.({ start: null, end: null })}
              >
                {labels.clear}
              </Button>
              <Button
                disabled={disabled || loading || !!error || !valid || !value.start || !value.end}
                onClick={() => onOpenChange(false)}
              >
                {labels.done}
              </Button>
            </div>
          </Popover.Content>
        </Popover>
        {hasDescription && (
          <div id={`${id}-description`} className={s.description}>
            {description}
          </div>
        )}
        {!open && error && (
          <div id={`${id}-error`} role="alert" className={s.error}>
            {error}
          </div>
        )}
        {!open && !valid && (
          <p role="status" className={s.error}>
            {labels.invalid}
          </p>
        )}
      </div>
    );
  },
);
