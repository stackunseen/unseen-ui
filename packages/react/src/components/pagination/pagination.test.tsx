import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from './pagination.js';

describe('Pagination', () => {
  it('requests pages by keyboard without changing controlled state or submitting the enclosing form', async () => {
    const change = vi.fn();
    const submit = vi.fn((event) => event.preventDefault());
    const user = userEvent.setup();
    const { rerender } = render(
      <form onSubmit={submit}>
        <Pagination page={3} pageCount={10} onPageChange={change} />
      </form>,
    );
    const next = screen.getByRole('button', { name: 'Next page' });
    next.focus();
    await user.keyboard('{Enter}');
    expect(change).toHaveBeenCalledWith(4);
    expect(screen.getByRole('status')).toHaveTextContent('Page 3 of 10');
    expect(submit).not.toHaveBeenCalled();
    rerender(
      <form onSubmit={submit}>
        <Pagination page={4} pageCount={10} onPageChange={change} />
      </form>,
    );
    expect(screen.getByRole('button', { name: 'Next page' })).toBe(next);
    expect(next).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Page 4' })).toHaveAttribute('aria-current', 'page');
  });

  it('bounds rendering for huge totals and makes ellipses non-interactive', async () => {
    const change = vi.fn();
    render(
      <Pagination page={500_000} pageCount={1_000_000} onPageChange={change} siblingCount={2} />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(9);
    expect(screen.getByRole('button', { name: 'Page 1' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Page 1000000' })).toBeEnabled();
    const gaps = screen.getAllByText('More pages');
    expect(gaps).toHaveLength(2);
    gaps.forEach((gap) =>
      expect(gap.closest('li')?.querySelector('button,a,[tabindex]')).toBeNull(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Page 500000' }));
    expect(change).not.toHaveBeenCalled();
  });

  it('keeps focused numbered controls mounted when the controlled page changes', () => {
    const { rerender } = render(<Pagination page={4} pageCount={9} onPageChange={vi.fn()} />);
    const pageFive = screen.getByRole('button', { name: 'Page 5' });
    pageFive.focus();
    rerender(<Pagination page={5} pageCount={9} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Page 5' })).toBe(pageFive);
    expect(pageFive).toHaveFocus();
    expect(pageFive).toHaveAttribute('aria-current', 'page');
  });

  it('shows honest unknown totals and enables next only when explicitly reported', async () => {
    const change = vi.fn();
    const { rerender } = render(<Pagination page={2} onPageChange={change} />);
    expect(screen.getByRole('status')).toHaveTextContent('Page 2 · Total pages unknown');
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(change).toHaveBeenCalledWith(1);
    rerender(<Pagination page={2} hasNextPage onPageChange={change} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(change).toHaveBeenLastCalledWith(3);
    rerender(<Pagination page={2} hasNextPage={false} onPageChange={change} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it.each([
    { page: 0, pageCount: 5 },
    { page: 1.5, pageCount: 5 },
    { page: NaN, pageCount: 5 },
    { page: 6, pageCount: 5 },
    { page: 1, pageCount: Infinity },
    { page: 1, pageCount: -1 },
    { page: 2, pageCount: 0 },
  ])('disables invalid host bounds without inventing a current page: %j', async (bounds) => {
    const change = vi.fn();
    render(<Pagination {...bounds} onPageChange={change} />);
    expect(screen.getByRole('status')).toHaveTextContent('Page unavailable');
    expect(document.querySelector('[aria-current]')).toBeNull();
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
      await userEvent.click(button);
    }
    expect(change).not.toHaveBeenCalled();
  });

  it('distinguishes zero pages, one page, disabled state and read-only state', () => {
    const { rerender } = render(<Pagination page={1} pageCount={0} onPageChange={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('No pages');
    expect(screen.getAllByRole('button')).toHaveLength(2);
    rerender(<Pagination page={1} pageCount={1} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
    rerender(<Pagination page={2} pageCount={3} disabled onPageChange={vi.fn()} />);
    screen.getAllByRole('button').forEach((button) => expect(button).toBeDisabled());
    rerender(<Pagination page={2} pageCount={3} />);
    screen.getAllByRole('button').forEach((button) => expect(button).toBeDisabled());
  });

  it('never increments beyond safe integer bounds for an unknown total', () => {
    render(<Pagination page={Number.MAX_SAFE_INTEGER} hasNextPage onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
  });

  it('provides actual URLs without intercepting modified clicks or generating invalid destinations', () => {
    const href = vi.fn((page) => `#page=${page}`);
    const { rerender } = render(<Pagination page={1} pageCount={3} getPageHref={href} />);
    const next = screen.getByRole('link', { name: 'Next page' });
    expect(next).toHaveAttribute('href', '#page=2');
    const previous = screen.getByRole('link', { name: 'Previous page' });
    expect(previous).not.toHaveAttribute('href');
    expect(previous).toHaveAttribute('aria-disabled', 'true');
    expect(previous).toHaveAttribute('tabindex', '-1');
    expect(href).not.toHaveBeenCalledWith(0);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    next.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    href.mockClear();
    rerender(<Pagination page={Infinity} pageCount={3} getPageHref={href} />);
    expect(href).not.toHaveBeenCalled();
  });

  it('preserves RTL direction, ref, localized labels and caller descriptions', () => {
    const ref = createRef<HTMLElement>();
    render(
      <>
        <p id="results">Search results</p>
        <Pagination
          ref={ref}
          dir="rtl"
          page={2}
          hasNextPage
          aria-describedby="results"
          label="Results pages"
          onPageChange={vi.fn()}
          labels={{
            previous: 'Back',
            next: 'Forward',
            unknownSummary: (page) => `Showing ${page}`,
          }}
        />
      </>,
    );
    const nav = screen.getByRole('navigation', { name: 'Results pages' });
    expect(ref.current).toBe(nav);
    expect(nav).toHaveAttribute('dir', 'rtl');
    expect(nav).toHaveAccessibleDescription('Search results Showing 2');
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Forward' })).toBeEnabled();
  });
});
