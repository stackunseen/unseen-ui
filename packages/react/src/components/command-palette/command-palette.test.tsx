import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { CommandPalette } from './command-palette.js';
import type { CommandPaletteItem } from './command-palette.js';
import { useCommandPalette } from './use-command-palette.js';
import { markMatches } from './mark-matches.js';
import { LinkProvider } from '../../shared/link.js';
import type { LinkComponentProps } from '../../shared/link.js';

beforeAll(() => {
  // cmdk scrolls the active option into view and watches the list size; jsdom has neither.
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});
afterEach(cleanup);

const items: CommandPaletteItem[] = [
  { id: 'journal', label: 'Journal', group: 'Pages', href: '/journal/', hint: 'Section' },
  { id: 'maps', label: 'System maps', group: 'Maps', href: '/maps/', hint: 'Map index' },
  { id: 'rag', label: 'RAG map', group: 'Maps', href: '/maps/rag/', keywords: ['retrieval'] },
  { id: 'paths', label: 'Learning paths', group: 'Paths', href: '/paths/' },
  {
    id: 'admin',
    label: 'Admin',
    group: 'Pages',
    href: '/admin/',
    disabledReason: 'Sign in first.',
  },
];

function Opener() {
  const palette = useCommandPalette();
  return (
    <button type="button" onClick={palette.open}>
      Search
    </button>
  );
}

describe('CommandPalette', () => {
  it('opens from the shortcut and the hook, names the dialog, and returns focus to the opener', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Opener />
        <CommandPalette items={items} label="Search the site" />
      </>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    const opener = screen.getByRole('button', { name: 'Search' });
    opener.focus();
    await user.keyboard('{Control>}k{/Control}');
    const dialog = await screen.findByRole('dialog', { name: 'Search the site' });
    const input = within(dialog).getByRole('combobox', { name: 'Search the site' });
    await waitFor(() => expect(input).toHaveFocus());
    await waitFor(() => expect(input).toHaveAttribute('aria-activedescendant'));
    expect(within(dialog).getByRole('listbox')).toBeInTheDocument();
    expect(within(dialog).getByRole('group', { name: 'Pages' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(opener).toHaveFocus());
    await user.click(opener);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('filters static items by every word, moves with the keyboard, wraps, and selects with Enter', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<CommandPalette defaultOpen items={items} onSelect={onSelect} />);
    const input = await screen.findByRole('combobox');
    expect(screen.getAllByRole('option')).toHaveLength(5);
    await user.type(input, 'map rag');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('RAG map');
    expect(options[0]!.querySelector('mark')).toHaveTextContent('RAG');
    await user.clear(input);
    await user.type(input, 'retrieval');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await user.clear(input);
    const selected = () =>
      screen
        .getAllByRole('option')
        .findIndex((option) => option.getAttribute('aria-selected') === 'true');
    // DOM order groups by first appearance: Journal, Admin (disabled), System maps, RAG map, Paths.
    await waitFor(() => expect(selected()).toBe(0));
    await user.keyboard('{ArrowUp}');
    await waitFor(() => expect(selected()).toBe(4));
    await user.keyboard('{Home}');
    await waitFor(() => expect(selected()).toBe(0));
    await user.keyboard('{End}');
    await waitFor(() => expect(selected()).toBe(4));
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(selected()).toBe(0));
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(selected()).toBe(2));
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'maps' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('keeps disabled items unselectable and ignores Enter during composition', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<CommandPalette defaultOpen items={items} onSelect={onSelect} />);
    const input = await screen.findByRole('combobox');
    await user.type(input, 'admin');
    const option = screen.getByRole('option', { name: /Admin/ });
    expect(option).toHaveAttribute('aria-disabled', 'true');
    expect(option).toHaveTextContent('Sign in first.');
    await user.keyboard('{Enter}');
    expect(onSelect).not.toHaveBeenCalled();
    await user.clear(input);
    const composing = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(composing, 'isComposing', { value: true });
    act(() => {
      input.dispatchEvent(composing);
    });
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('debounces async results, aborts older queries, never shows stale results, and appends a trailing action', async () => {
    const signals: AbortSignal[] = [];
    const resolvers: ((items: CommandPaletteItem[]) => void)[] = [];
    const search = vi.fn((_query: string, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<CommandPaletteItem[]>((resolve) => {
        resolvers.push((found) => resolve(found));
      });
    });
    const user = userEvent.setup();
    render(
      <CommandPalette
        defaultOpen
        items={[]}
        search={search}
        debounceMs={30}
        trailingAction={(query) => ({
          id: 'all',
          label: `Search everything for "${query}"`,
          group: 'Search',
          href: `/search?q=${encodeURIComponent(query)}`,
        })}
      />,
    );
    const input = await screen.findByRole('combobox');
    await user.type(input, 'ev');
    expect(search).not.toHaveBeenCalled();
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('status').textContent).toContain('Searching');
    await user.type(input, 'als');
    await waitFor(() => expect(search).toHaveBeenCalledTimes(2));
    expect(signals[0]!.aborted).toBe(true);
    expect(search).toHaveBeenLastCalledWith('evals', expect.any(AbortSignal));
    // The older response arrives late and is dropped.
    await act(async () => {
      resolvers[0]!([{ id: 'stale', label: 'Stale result', group: 'Pages', href: '/stale/' }]);
    });
    expect(screen.queryByText('Stale result')).toBeNull();
    await act(async () => {
      resolvers[1]!([{ id: 'fresh', label: 'Evals guide', group: 'Pages', href: '/evals/' }]);
    });
    const options = await screen.findAllByRole('option');
    expect(options[0]).toHaveTextContent('Evals guide');
    expect(options[options.length - 1]).toHaveTextContent('Search everything for "evals"');
    expect(screen.getByRole('status').textContent).toContain('2 results');
  });

  it('follows the router link on Enter and click when a LinkProvider is set', async () => {
    const clicks: string[] = [];
    const RouterLink = forwardRef<HTMLAnchorElement, LinkComponentProps>(function RouterLink(
      { href, onClick, ...props },
      ref,
    ) {
      return (
        <a
          {...props}
          href={href}
          ref={ref}
          data-router=""
          onClick={(event) => {
            event.preventDefault();
            clicks.push(href);
            onClick?.(event);
          }}
        />
      );
    });
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <LinkProvider component={RouterLink}>
        <CommandPalette defaultOpen items={items} onSelect={onSelect} />
      </LinkProvider>,
    );
    const input = await screen.findByRole('combobox');
    const option = screen.getByRole('option', { name: /Journal/ });
    expect(option.tagName).toBe('A');
    expect(option).toHaveAttribute('data-router');
    expect(option).toHaveAttribute('href', '/journal/');
    await waitFor(() => expect(input).toHaveFocus());
    await waitFor(() => expect(input).toHaveAttribute('aria-activedescendant'));
    await user.keyboard('{Enter}');
    expect(clicks).toEqual(['/journal/']);
    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('renders nothing on the server while closed and marks matches safely', () => {
    expect(renderToString(<CommandPalette items={items} />)).toBe('');
    const marked = renderToString(<>{markMatches('Retrieval <b>pipelines</b>', 'val <b>')}</>);
    expect(marked).toContain('<mark>val</mark>');
    expect(marked).toContain('&lt;b&gt;');
    expect(marked).toContain('<mark>&lt;b&gt;</mark>');
    expect(markMatches('Plain', '')).toBe('Plain');
  });
});
