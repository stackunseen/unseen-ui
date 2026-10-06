import { createRef, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { Calendar } from './calendar.js';
import type { CalendarProps, DateOnly, DateRange } from './types.js';

const emptyRange: DateRange = { start: null, end: null };
function day(date: string) {
  return document.querySelector<HTMLButtonElement>(`button[data-date="${date}"]`)!;
}
const base = { month: '2024-02-01' as DateOnly, onMonthChange: vi.fn(), locale: 'en-US' };

describe('Calendar', () => {
  it('requests a date by keyboard and preserves controlled selection and native form behavior', async () => {
    const change = vi.fn();
    const submit = vi.fn((event) => event.preventDefault());
    const user = userEvent.setup();
    const { rerender } = render(
      <form onSubmit={submit}>
        <Calendar {...base} value={null} onValueChange={change} />
      </form>,
    );
    const first = day('2024-02-01');
    first.focus();
    await user.keyboard('{ArrowRight}{Enter}');
    expect(day('2024-02-02')).toHaveFocus();
    expect(change).toHaveBeenCalledWith('2024-02-02');
    expect(screen.getByRole('status')).toHaveTextContent('No date selected');
    expect(document.querySelectorAll('[aria-selected="true"]')).toHaveLength(0);
    expect(document.querySelectorAll('button[data-date][tabindex="0"]')).toHaveLength(1);
    expect(submit).not.toHaveBeenCalled();
    rerender(<Calendar {...base} value="2024-02-02" onValueChange={change} />);
    expect(day('2024-02-02').closest('td')).toHaveAttribute('aria-selected', 'true');
  });

  it('moves focus over leap-day/month/year boundaries after the host updates month', async () => {
    const change = vi.fn();
    function Example() {
      const [month, setMonth] = useState<DateOnly>('2024-02-01');
      return (
        <Calendar
          month={month}
          onMonthChange={(next) => {
            change(next);
            setMonth(next);
          }}
          locale="en-US"
          value="2024-02-29"
          onValueChange={vi.fn()}
        />
      );
    }
    render(<Example />);
    day('2024-02-29').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(change).toHaveBeenLastCalledWith('2024-03-01');
    await waitFor(() => expect(day('2024-03-01')).toHaveFocus());
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() => expect(day('2024-02-29')).toHaveFocus());
    await userEvent.keyboard('{Shift>}{PageDown}{/Shift}');
    expect(change).toHaveBeenLastCalledWith('2025-02-01');
    await waitFor(() => expect(day('2025-02-28')).toHaveFocus());
  });

  it('retains focus and its tab stop when a month request is not accepted', async () => {
    const monthChange = vi.fn();
    render(
      <Calendar {...base} value="2024-02-29" onMonthChange={monthChange} onValueChange={vi.fn()} />,
    );
    day('2024-02-29').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(monthChange).toHaveBeenCalledWith('2024-03-01');
    expect(day('2024-02-29')).toHaveFocus();
    expect(day('2024-02-29')).toHaveAttribute('tabindex', '0');
    expect(day('2024-03-01')).toBeNull();
  });

  it('does not steal focus after a delayed month acknowledgement when the user has left the grid', async () => {
    const view = (month: DateOnly) => (
      <>
        <button>Other field</button>
        <Calendar {...base} month={month} value="2024-02-29" onValueChange={vi.fn()} />
      </>
    );
    const { rerender } = render(view('2024-02-01'));
    day('2024-02-29').focus();
    await userEvent.keyboard('{ArrowRight}');
    const outside = screen.getByRole('button', { name: 'Other field' });
    await userEvent.click(outside);
    rerender(view('2024-03-01'));
    expect(outside).toHaveFocus();
  });

  it('moves by week and week edges, clamps Page Up/Down, and bounds keyboard navigation', async () => {
    const monthChange = vi.fn();
    render(
      <Calendar
        {...base}
        value="2024-02-15"
        onValueChange={vi.fn()}
        onMonthChange={monthChange}
        min="2024-02-05"
        max="2024-02-26"
      />,
    );
    day('2024-02-15').focus();
    await userEvent.keyboard('{Home}');
    expect(day('2024-02-12')).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(day('2024-02-18')).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(day('2024-02-11')).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(day('2024-02-18')).toHaveFocus();
    await userEvent.keyboard('{PageUp}');
    expect(day('2024-02-05')).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(day('2024-02-05')).toHaveFocus();
    await userEvent.keyboard('{PageDown}');
    expect(day('2024-02-26')).toHaveFocus();
    expect(monthChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Previous month/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Next month/ })).toBeDisabled();
  });

  it('keeps unavailable days discoverable by arrows while blocking pointer/Enter/Space selection', async () => {
    const change = vi.fn();
    render(
      <Calendar
        {...base}
        value="2024-02-15"
        onValueChange={change}
        disabledDates={['2024-02-16']}
        min="2024-02-10"
        max="2024-02-20"
      />,
    );
    expect(day('2024-02-09')).toHaveAttribute('aria-disabled', 'true');
    expect(day('2024-02-21')).toHaveAttribute('aria-disabled', 'true');
    day('2024-02-15').focus();
    await userEvent.keyboard('{ArrowRight}{Enter} ');
    expect(day('2024-02-16')).toHaveFocus();
    await userEvent.click(day('2024-02-16'));
    expect(change).not.toHaveBeenCalled();
    await userEvent.keyboard('{ArrowRight}{Enter}');
    expect(change).toHaveBeenCalledWith('2024-02-17');
  });

  it('selects controlled ranges, restarts with an earlier date, and supports one-day ranges', async () => {
    const change = vi.fn();
    const { rerender } = render(
      <Calendar {...base} mode="range" value={emptyRange} onValueChange={change} />,
    );
    await userEvent.click(day('2024-02-20'));
    expect(change).toHaveBeenLastCalledWith({ start: '2024-02-20', end: null });
    rerender(
      <Calendar
        {...base}
        mode="range"
        value={{ start: '2024-02-20', end: null }}
        onValueChange={change}
      />,
    );
    await userEvent.click(day('2024-02-10'));
    expect(change).toHaveBeenLastCalledWith({ start: '2024-02-10', end: null });
    await userEvent.click(day('2024-02-20'));
    expect(change).toHaveBeenLastCalledWith({ start: '2024-02-20', end: '2024-02-20' });
    rerender(
      <Calendar
        {...base}
        mode="range"
        value={{ start: '2024-02-20', end: '2024-02-22' }}
        onValueChange={change}
      />,
    );
    expect(screen.getByRole('grid')).toHaveAttribute('aria-multiselectable', 'true');
    expect(document.querySelectorAll('[aria-selected="true"]')).toHaveLength(3);
    expect(day('2024-02-20')).toHaveAccessibleName(/Start date/);
    expect(day('2024-02-22')).toHaveAccessibleName(/End date/);
    expect(screen.getByRole('status')).toHaveTextContent('Selected range');
    await userEvent.click(day('2024-02-25'));
    expect(change).toHaveBeenLastCalledWith({ start: '2024-02-25', end: null });
  });

  it('rejects a range crossing disabled dates and clears feedback after a valid request', async () => {
    const change = vi.fn();
    render(
      <Calendar
        {...base}
        mode="range"
        value={{ start: '2024-02-10', end: null }}
        disabledDates={['2024-02-15']}
        onValueChange={change}
      />,
    );
    await userEvent.click(day('2024-02-20'));
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('includes an unavailable date');
    await userEvent.click(day('2024-02-14'));
    expect(change).toHaveBeenCalledWith({ start: '2024-02-10', end: '2024-02-14' });
    expect(screen.getByRole('status')).toHaveTextContent('Choose an end date');
  });

  it('reconciles rejected-range feedback with updated host exclusions', async () => {
    const change = vi.fn();
    const value: DateRange = { start: '2024-02-10', end: null };
    const { rerender } = render(
      <Calendar
        {...base}
        mode="range"
        value={value}
        disabledDates={['2024-02-15']}
        onValueChange={change}
      />,
    );
    await userEvent.click(day('2024-02-20'));
    expect(screen.getByRole('status')).toHaveTextContent('includes an unavailable date');
    rerender(<Calendar {...base} mode="range" value={value} onValueChange={change} />);
    expect(screen.getByRole('status')).toHaveTextContent('Choose an end date');
    await userEvent.click(day('2024-02-20'));
    expect(change).toHaveBeenCalledWith({ start: '2024-02-10', end: '2024-02-20' });
  });

  it('has no automated semantic accessibility violations in the ready range grid', async () => {
    const { container } = render(
      <Calendar
        {...base}
        mode="range"
        value={{ start: '2024-02-10', end: '2024-02-12' }}
        onValueChange={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('gridcell')).toHaveLength(29);
    const report = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(report.violations).toEqual([]);
  });

  it.each([
    { mode: 'range', value: { start: '2024-02-20', end: '2024-02-10' } },
    { mode: 'range', value: { start: null, end: '2024-02-10' } },
    {
      mode: 'range',
      value: { start: '2024-02-10', end: '2024-02-20' },
      disabledDates: ['2024-02-15'],
    },
    { value: '2024-02-30' },
    { value: null, min: '2024-03-01', max: '2024-02-01' },
    { value: null, locale: '' },
    { value: null, today: '2024-02-30' },
  ])('reports invalid host configuration without rewriting values: %j', (invalid) => {
    const change = vi.fn();
    render(<Calendar {...({ ...base, ...invalid, onValueChange: change } as CalendarProps)} />);
    expect(screen.getByRole('status')).toHaveTextContent('Calendar unavailable');
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Previous month/ })).toBeDisabled();
  });

  it('distinguishes loading, host error, empty month, disabled and read-only states', async () => {
    const change = vi.fn();
    const { rerender } = render(<Calendar {...base} value={null} loading onValueChange={change} />);
    expect(screen.getByRole('group')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Loading dates');
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    rerender(
      <Calendar {...base} value={null} error="Dates failed to load" onValueChange={change} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Dates failed to load');
    expect(day('2024-02-01')).toBeDisabled();
    rerender(<Calendar {...base} value={null} min="2024-03-01" onValueChange={change} />);
    expect(screen.getByRole('status')).toHaveTextContent('No available dates');
    expect(screen.getByRole('button', { name: /Next month/ })).toBeEnabled();
    rerender(<Calendar {...base} value={null} disabled onValueChange={change} />);
    expect(day('2024-02-01')).toBeDisabled();
    rerender(<Calendar {...base} value={null} />);
    expect(screen.getByRole('grid')).toHaveAttribute('aria-readonly', 'true');
    await userEvent.click(day('2024-02-01'));
    expect(change).not.toHaveBeenCalled();
  });

  it('supports localized dates, custom labels/icons, RTL arrows, root attributes and explicit today', async () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Calendar
        {...base}
        ref={ref}
        value="2024-02-15"
        locale="de-DE"
        label="Termin"
        dir="rtl"
        weekStartsOn={0}
        today="2024-02-15"
        onValueChange={vi.fn()}
        labels={{ previousMonth: 'Zurück', nextMonth: 'Weiter' }}
        previousIcon="Back"
        nextIcon="Forward"
        data-testid="calendar"
      />,
    );
    expect(ref.current).toBe(screen.getByTestId('calendar'));
    expect(ref.current).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('grid')).toHaveAccessibleName('Februar 2024');
    expect(screen.getByRole('button', { name: /Zurück/ })).toBeInTheDocument();
    expect(day('2024-02-15')).toHaveAttribute('aria-current', 'date');
    expect(day('2024-02-15')).toHaveAccessibleName(/Donnerstag/);
    expect(screen.getAllByRole('columnheader')[0]).toHaveTextContent('So');
    day('2024-02-15').focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(day('2024-02-16')).toHaveFocus();
  });
});
