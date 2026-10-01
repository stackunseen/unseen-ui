import { createRef } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Breadcrumb } from './breadcrumb.js';

describe('Breadcrumb', () => {
  const items = [
    { id: 'home', label: 'Home', href: '/' },
    { id: 'projects', label: 'Projects', href: '/projects' },
    { id: 'project', label: 'Current project', href: '/projects/one' },
  ];

  it('uses a named ordered trail with native links, one current page and decorative separators', async () => {
    render(<Breadcrumb items={items} />);
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(trail).getByRole('list').tagName).toBe('OL');
    expect(
      within(trail)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/', '/projects']);
    expect(screen.getByText('Current project')).toHaveAttribute('aria-current', 'page');
    screen
      .getAllByText('/')
      .forEach((separator) => expect(separator).toHaveAttribute('aria-hidden', 'true'));
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveFocus();
  });

  it('supports explicit current location, inert ancestors and unmatched host location', () => {
    const { rerender } = render(
      <Breadcrumb items={[{ id: 'group', label: 'Library' }, ...items]} currentId="projects" />,
    );
    expect(screen.getByText('Library').tagName).toBe('SPAN');
    expect(screen.getByText('Projects')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Current project' })).toHaveAttribute(
      'href',
      '/projects/one',
    );
    rerender(<Breadcrumb items={items} currentId="missing" />);
    expect(document.querySelector('[aria-current]')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('retains consumer routing events, attributes, focus and DOM identity across label updates', () => {
    const click = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => event.preventDefault());
    const ref = createRef<HTMLElement>();
    const { rerender } = render(
      <Breadcrumb
        ref={ref}
        aria-label="Documentation trail"
        dir="rtl"
        items={[{ ...items[0]!, onClick: click, target: '_blank', rel: 'noopener' }, items[2]!]}
      />,
    );
    const link = screen.getByRole('link', { name: 'Home' });
    link.focus();
    fireEvent.click(link, { ctrlKey: true });
    expect(click).toHaveBeenCalledOnce();
    expect(click.mock.calls[0]![0].ctrlKey).toBe(true);
    expect(link).toHaveAttribute('target', '_blank');
    expect(ref.current).toBe(screen.getByRole('navigation', { name: 'Documentation trail' }));
    rerender(<Breadcrumb items={[{ ...items[0]!, label: 'Start' }, items[2]!]} />);
    expect(screen.getByRole('link', { name: 'Start' })).toBe(link);
    expect(link).toHaveFocus();
  });

  it('does not create an empty navigation landmark and renders supplied text inertly', () => {
    const { rerender } = render(<Breadcrumb items={[]} />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    rerender(<Breadcrumb items={[{ id: 'one', label: '<script>alert(1)</script>' }]} />);
    expect(screen.getByText('<script>alert(1)</script>')).toHaveAttribute('aria-current', 'page');
    expect(document.querySelector('script')).toBeNull();
  });
});
