import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './segmented-control.js';

afterEach(cleanup);
const options = [
  { value: 'latest', label: 'Latest', href: '/journal/' },
  { value: 'discipline', label: 'By discipline', href: '/journal/?view=discipline' },
  { value: 'archive', label: 'Archive', href: '/journal/archive/', disabled: true },
  {
    value: 'enterprise',
    label: 'Enterprise',
    description: 'Needs an account',
    href: '/enterprise/',
  },
];

describe('SegmentedControl', () => {
  it('is a radiogroup with one tab stop where arrow keys move and select', async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <SegmentedControl
        label="View"
        options={options}
        value="latest"
        onValueChange={onValueChange}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: 'View' })).toBeInTheDocument();
    const latest = screen.getByRole('radio', { name: 'Latest' });
    expect(latest).toHaveAttribute('aria-checked', 'true');
    expect(latest).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'By discipline' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('radio', { name: 'Archive' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Enterprise Needs an account' })).toBeInTheDocument();
    await user.tab();
    expect(latest).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'By discipline' })).toHaveFocus();
    expect(onValueChange).toHaveBeenLastCalledWith('discipline');
    await user.keyboard('{End}');
    expect(screen.getByRole('radio', { name: 'Enterprise Needs an account' })).toHaveFocus();
    expect(onValueChange).toHaveBeenLastCalledWith('enterprise');
    await user.keyboard('{ArrowRight}');
    expect(latest).toHaveFocus();
    onValueChange.mockClear();
    await user.click(latest);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('renders links with aria-current in link mode and on the server', async () => {
    const html = renderToString(
      <SegmentedControl label="View" options={options} value="discipline" mode="links" />,
    );
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain('role="radio"');
    render(<SegmentedControl label="View" options={options} value="discipline" mode="links" />);
    const current = screen.getByRole('link', { name: 'By discipline' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current).toHaveAttribute('href', '/journal/?view=discipline');
    expect(screen.getByRole('link', { name: 'Latest' })).not.toHaveAttribute('aria-current');
    expect(screen.getByText('Archive').closest('a')).not.toHaveAttribute('href');
    await userEvent.tab();
    expect(current).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('link', { name: 'Latest' })).toHaveFocus();
  });
});
