import { createRef, useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { AITheme } from '../../providers/theme/theme-provider.js';
import { DateRangePicker } from './date-range-picker.js';
import type { DateOnly, DateRange } from '../calendar/types.js';

const empty: DateRange = { start: null, end: null };
const base = {
  value: empty,
  month: '2024-02-01' as DateOnly,
  locale: 'en-US',
  onMonthChange: vi.fn(),
  onOpenChange: vi.fn(),
};
const day = (date: string) =>
  document.querySelector<HTMLButtonElement>(`button[data-date="${date}"]`)!;

describe('DateRangePicker', () => {
  it('opens by keyboard, focuses the date grid, selects a range, and returns focus after Done', async () => {
    const user = userEvent.setup();
    function Example() {
      const [value, setValue] = useState(empty);
      const [open, setOpen] = useState(false);
      const [month, setMonth] = useState<DateOnly>('2024-02-01');
      return (
        <AITheme appearance="dark">
          <DateRangePicker
            {...base}
            value={value}
            onValueChange={setValue}
            open={open}
            onOpenChange={setOpen}
            month={month}
            onMonthChange={setMonth}
            label="Travel dates"
          />
        </AITheme>
      );
    }
    render(<Example />);
    const trigger = screen.getByRole('button', { name: /Travel dates/ });
    trigger.focus();
    await user.keyboard('{Enter}');
    const dialog = await screen.findByRole('dialog', { name: 'Choose date range' });
    expect(dialog.closest('[data-appearance]')).toHaveAttribute('data-appearance', 'dark');
    await waitFor(() => expect(day('2024-02-01')).toHaveFocus());
    expect(within(dialog).getByRole('button', { name: 'Done' })).toBeDisabled();
    await user.keyboard('{Enter}{ArrowRight}{ArrowRight}{Enter}');
    expect(trigger).toHaveTextContent('Thursday, February 1, 2024 — Saturday, February 3, 2024');
    expect(within(dialog).getByRole('status')).toHaveTextContent('Selected range');
    expect(dialog).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('requests opening, selection, clear and closure without assuming host acknowledgement', async () => {
    const change = vi.fn();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <DateRangePicker {...base} open={false} onOpenChange={onOpenChange} onValueChange={change} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Choose start and end dates/ }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(<DateRangePicker {...base} open onOpenChange={onOpenChange} onValueChange={change} />);
    await userEvent.click(day('2024-02-10'));
    expect(change).toHaveBeenLastCalledWith({ start: '2024-02-10', end: null });
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
    const value: DateRange = { start: '2024-02-10', end: '2024-02-12' };
    rerender(
      <DateRangePicker
        {...base}
        value={value}
        open
        onOpenChange={onOpenChange}
        onValueChange={change}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Clear range' }));
    expect(change).toHaveBeenLastCalledWith(empty);
    expect(screen.getByRole('button', { name: /Date range Saturday/ })).toHaveTextContent(
      'Monday, February 12, 2024',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('restores focus on Escape and keeps selection unchanged', async () => {
    const change = vi.fn();
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <DateRangePicker {...base} open={open} onOpenChange={setOpen} onValueChange={change} />
      );
    }
    render(<Example />);
    const trigger = screen.getByRole('button', { name: /Date range/ });
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(change).not.toHaveBeenCalled();
  });

  it('shows invalid range feedback and allows a host-controlled clear request', async () => {
    const change = vi.fn();
    render(
      <DateRangePicker
        {...base}
        value={{ start: '2024-02-20', end: '2024-02-10' }}
        open
        onValueChange={change}
      />,
    );
    const trigger = screen.getByRole('button', { name: /Date range Date range unavailable/ });
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Clear range' }));
    expect(change).toHaveBeenCalledWith(empty);
  });

  it('has explicit disabled, loading, host-error and read-only behavior', async () => {
    const change = vi.fn();
    const { rerender } = render(
      <DateRangePicker {...base} open={false} disabled onValueChange={change} />,
    );
    expect(screen.getByRole('button')).toBeDisabled();
    rerender(<DateRangePicker {...base} open loading onValueChange={change} />);
    expect(screen.getByRole('button', { name: /Date range/ })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Loading dates');
    expect(screen.getByRole('button', { name: 'Clear range' })).toBeDisabled();
    rerender(
      <DateRangePicker {...base} open error="Date service unavailable" onValueChange={change} />,
    );
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
    expect(day('2024-02-01')).toBeDisabled();
    rerender(<DateRangePicker {...base} open />);
    expect(screen.getByRole('grid')).toHaveAttribute('aria-readonly', 'true');
    await userEvent.click(day('2024-02-01'));
    expect(change).not.toHaveBeenCalled();
  });

  it('preserves custom root props and translated labels with descriptive trigger content', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <>
        <p id="external">Invoice reporting period</p>
        <DateRangePicker
          {...base}
          ref={ref}
          open={false}
          dir="rtl"
          locale="de-DE"
          label="Zeitraum"
          description="Datum auswählen"
          aria-describedby="external"
          labels={{
            placeholder: 'Daten wählen',
            title: 'Kalender',
            clear: 'Löschen',
            done: 'Fertig',
          }}
          triggerIcon={<span>Icon</span>}
          data-testid="picker"
        />
      </>,
    );
    expect(ref.current).toBe(screen.getByTestId('picker'));
    expect(ref.current).toHaveAttribute('dir', 'rtl');
    expect(
      screen.getByRole('button', { name: 'Zeitraum Daten wählen' }),
    ).toHaveAccessibleDescription('Invoice reporting period Datum auswählen');
  });

  it('has no automated semantic accessibility violations in the open range dialog', async () => {
    render(<DateRangePicker {...base} open onValueChange={vi.fn()} />);
    const report = await axe.run(screen.getByRole('dialog'), {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(report.violations).toEqual([]);
  });
});
