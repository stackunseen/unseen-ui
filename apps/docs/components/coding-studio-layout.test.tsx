import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { CodingStudio } from './coding-studio';

// This test exercises explorer defaults, not the optional peer's measured pane layout.
vi.mock('@stackunseen/ui/layout', () => ({
  SplitPane: ({
    primary,
    secondary,
  }: {
    primary: { children: ReactNode };
    secondary: { children: ReactNode };
  }) => (
    <div>
      {primary.children}
      {secondary.children}
    </div>
  ),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function viewport(initialNarrow: boolean) {
  let narrow = initialNarrow;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', (media: string) => ({
    media,
    get matches() {
      return media === '(max-width: 760px)' && narrow;
    },
    onchange: null,
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      if (media === '(max-width: 760px)' && typeof listener === 'function')
        listeners.add(listener as () => void);
    },
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === 'function') listeners.delete(listener as () => void);
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
  }));
  return (next: boolean) =>
    act(() => {
      narrow = next;
      listeners.forEach((listener) => listener());
    });
}

describe('Coding Studio responsive explorer', () => {
  it('starts narrow layouts with the explorer closed and opens it deliberately', async () => {
    viewport(true);
    render(<CodingStudio />);
    const files = screen.getByRole('button', { name: /^Files$/ });
    expect(files).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('complementary', { name: 'Project explorer' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit file' })).toBeVisible();
    await userEvent.click(files);
    expect(files).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('complementary', { name: 'Project explorer' })).toBeVisible();
    await userEvent.click(files);
    expect(files).toHaveFocus();
    expect(files).toHaveAttribute('aria-expanded', 'false');
  });

  it('adapts the untouched default to resizing but preserves an explicit preference', async () => {
    const resize = viewport(false);
    render(<CodingStudio />);
    const files = screen.getByRole('button', { name: /^Files$/ });
    expect(files).toHaveAttribute('aria-expanded', 'true');
    resize(true);
    expect(files).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(files);
    resize(false);
    resize(true);
    expect(files).toHaveAttribute('aria-expanded', 'true');
  });
});
