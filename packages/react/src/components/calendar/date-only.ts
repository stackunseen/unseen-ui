import type { DateConstraints, DateOnly, DateRange } from './types.js';

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function parseDateOnly(value: unknown): { year: number; month: number; day: number } | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day || year > 9999 || month > 12 || day > daysInMonth(year, month))
    return null;
  return { year, month, day };
}

function serialize(year: number, month: number, day: number): DateOnly {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` as DateOnly;
}

/** Numeric UTC construction is used only for Gregorian arithmetic/Intl formatting, never local parsing. */
export function dateForFormatting(value: DateOnly): Date {
  const parts = parseDateOnly(value);
  if (!parts) throw new RangeError('Expected a Gregorian YYYY-MM-DD date');
  const date = new Date(0);
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  return date;
}

export function addDays(value: DateOnly, amount: number): DateOnly | null {
  const date = dateForFormatting(value);
  date.setUTCDate(date.getUTCDate() + amount);
  const year = date.getUTCFullYear();
  return year < 1 || year > 9999
    ? null
    : serialize(year, date.getUTCMonth() + 1, date.getUTCDate());
}

export function addMonths(value: DateOnly, amount: number): DateOnly | null {
  const { year, month, day } = parseDateOnly(value)!;
  const index = year * 12 + month - 1 + amount;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  return nextYear < 1 || nextYear > 9999
    ? null
    : serialize(nextYear, nextMonth, Math.min(day, daysInMonth(nextYear, nextMonth)));
}

export function monthStart(value: DateOnly): DateOnly {
  return `${value.slice(0, 7)}-01` as DateOnly;
}

export function monthEnd(value: DateOnly): DateOnly {
  const { year, month } = parseDateOnly(value)!;
  return serialize(year, month, daysInMonth(year, month));
}

export function sameMonth(first: DateOnly, second: DateOnly): boolean {
  return first.slice(0, 7) === second.slice(0, 7);
}

export function validConstraints({ min, max, disabledDates = [] }: DateConstraints): boolean {
  return (
    (!min || !!parseDateOnly(min)) &&
    (!max || !!parseDateOnly(max)) &&
    (!min || !max || min <= max) &&
    disabledDates.every((date) => !!parseDateOnly(date))
  );
}

export function isUnavailable(
  date: DateOnly,
  { min, max, disabledDates = [] }: DateConstraints,
): boolean {
  return !!((min && date < min) || (max && date > max) || disabledDates.includes(date));
}

/** Checks the entire interval without walking potentially millions of calendar days. */
export function validRange(range: DateRange, constraints: DateConstraints): boolean {
  const { start, end } = range;
  if (!start) return end === null;
  if (!parseDateOnly(start) || isUnavailable(start, constraints)) return false;
  if (!end) return true;
  return (
    !!parseDateOnly(end) &&
    start <= end &&
    !isUnavailable(end, constraints) &&
    !(constraints.disabledDates ?? []).some((date) => date >= start && date <= end)
  );
}

export function getMonthCells(month: DateOnly, weekStartsOn: number): (DateOnly | null)[] {
  const first = monthStart(month);
  const offset = (dateForFormatting(first).getUTCDay() - weekStartsOn + 7) % 7;
  const { year, month: monthNumber } = parseDateOnly(month)!;
  const count = daysInMonth(year, monthNumber);
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - offset + 1;
    return day > 0 && day <= count ? serialize(year, monthNumber, day) : null;
  });
}

export function getDateFormatters(locale: string) {
  try {
    if (!locale.trim() || Intl.DateTimeFormat.supportedLocalesOf(locale).length === 0) return null;
    const options = { timeZone: 'UTC', calendar: 'gregory' };
    const full = new Intl.DateTimeFormat(locale, { ...options, dateStyle: 'full' });
    const month = new Intl.DateTimeFormat(locale, { ...options, month: 'long', year: 'numeric' });
    const weekday = new Intl.DateTimeFormat(locale, { ...options, weekday: 'short' });
    const weekdayFull = new Intl.DateTimeFormat(locale, { ...options, weekday: 'long' });
    const number = new Intl.NumberFormat(locale, { useGrouping: false });
    return {
      full: (date: DateOnly) => full.format(dateForFormatting(date)),
      month: (date: DateOnly) => month.format(dateForFormatting(date)),
      day: (date: DateOnly) => number.format(parseDateOnly(date)!.day),
      weekdays: Array.from({ length: 7 }, (_, index) => {
        const date = dateForFormatting(addDays('2024-01-07', index)!);
        return { short: weekday.format(date), full: weekdayFull.format(date) };
      }),
    };
  } catch {
    return null;
  }
}
