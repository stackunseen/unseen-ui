import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  dateForFormatting,
  getDateFormatters,
  getMonthCells,
  parseDateOnly,
  validConstraints,
  validRange,
} from './date-only.js';
import type { DateOnly } from './types.js';

describe('date-only Gregorian operations', () => {
  it.each([
    '2023-02-29',
    '1900-02-29',
    '2024-04-31',
    '2024-00-01',
    '2024-13-01',
    '0000-01-01',
    '10000-01-01',
    '2024-2-01',
    '2024-02-1',
    '2024-02-01T00:00:00Z',
    '',
    null,
  ])('rejects invalid dates: %s', (date) => {
    expect(parseDateOnly(date)).toBeNull();
  });

  it.each(['2024-02-29', '2000-02-29', '0001-01-01', '0099-12-31', '9999-12-31'])(
    'accepts valid dates: %s',
    (date) => {
      expect(parseDateOnly(date)).not.toBeNull();
    },
  );

  it.each([
    ['2024-02-28', 1, '2024-02-29'],
    ['2023-02-28', 1, '2023-03-01'],
    ['2024-02-29', 1, '2024-03-01'],
    ['2024-01-31', 1, '2024-02-01'],
    ['2024-12-31', 1, '2025-01-01'],
    ['2024-03-10', 1, '2024-03-11'],
    ['0001-01-01', -1, null],
    ['9999-12-31', 1, null],
  ] as const)('adds days without local-time or DST drift: %s + %s', (date, count, expected) => {
    expect(addDays(date, count)).toBe(expected);
  });

  it.each([
    ['2024-01-31', 1, '2024-02-29'],
    ['2023-01-31', 1, '2023-02-28'],
    ['2024-02-29', 12, '2025-02-28'],
    ['2024-01-31', -1, '2023-12-31'],
    ['0001-01-01', -1, null],
    ['9999-12-31', 1, null],
  ] as const)('clamps day-of-month and bounds years: %s + %s months', (date, count, expected) => {
    expect(addMonths(date, count)).toBe(expected);
  });

  it('formats with explicit UTC Gregorian semantics, including years below 100', () => {
    const date = dateForFormatting('0099-01-01');
    expect(date.getUTCFullYear()).toBe(99);
    expect(date.getUTCMonth()).toBe(0);
    expect(date.getUTCDate()).toBe(1);
    expect(getDateFormatters('en-US')!.full('2024-03-01')).toBe('Friday, March 1, 2024');
    expect(getDateFormatters('de-DE')!.month('2024-03-01')).toBe('März 2024');
    expect(getDateFormatters('')).toBeNull();
    expect(getDateFormatters('not_a_locale')).toBeNull();
  });

  it('builds a bounded six-week month aligned to the supplied week start', () => {
    const monday = getMonthCells('2024-02-29', 1);
    expect(monday).toHaveLength(42);
    expect(monday.slice(0, 4)).toEqual([null, null, null, '2024-02-01']);
    expect(monday.filter(Boolean)).toHaveLength(29);
    expect(getMonthCells('2024-02-01', 0).slice(0, 5)).toEqual([
      null,
      null,
      null,
      null,
      '2024-02-01',
    ]);
  });

  it('rejects malformed and reversed bounds', () => {
    expect(validConstraints({ min: '2024-04-01', max: '2024-03-01' })).toBe(false);
    expect(validConstraints({ disabledDates: ['2024-02-30'] })).toBe(false);
  });

  it('validates partial, same-day and complete ranges, including blocked interior dates', () => {
    const constraints = {
      min: '2024-02-01' as DateOnly,
      max: '2024-03-31' as DateOnly,
      disabledDates: ['2024-02-29' as DateOnly],
    };
    expect(validRange({ start: null, end: null }, constraints)).toBe(true);
    expect(validRange({ start: '2024-02-28', end: null }, constraints)).toBe(true);
    expect(validRange({ start: '2024-02-28', end: '2024-02-28' }, constraints)).toBe(true);
    expect(validRange({ start: '2024-02-28', end: '2024-03-01' }, constraints)).toBe(false);
    expect(validRange({ start: '2024-03-01', end: '2024-02-28' }, constraints)).toBe(false);
    expect(validRange({ start: null, end: '2024-03-01' }, constraints)).toBe(false);
    expect(validRange({ start: '2024-01-31', end: null }, constraints)).toBe(false);
    expect(validRange({ start: '2024-02-28', end: '2024-04-01' }, constraints)).toBe(false);
  });

  it('checks long ranges using explicit exclusions rather than walking every day', () => {
    expect(validRange({ start: '0001-01-01', end: '9999-12-31' }, {})).toBe(true);
    expect(
      validRange({ start: '0001-01-01', end: '9999-12-31' }, { disabledDates: ['2024-02-29'] }),
    ).toBe(false);
  });
});
