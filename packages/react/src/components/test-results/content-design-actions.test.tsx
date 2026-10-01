import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestResults } from './test-results.js';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => vi.unstubAllGlobals());

describe('contextual content actions', () => {
  it.each(['list', 'cards', 'compact'] as const)(
    '%s test file opens through a contextual icon and diagnostic reading has a named focus target',
    async (variant) => {
      const open = vi.fn();
      const path = `tests/${'very-long-source-name-'.repeat(8)}search.test.ts`;
      const detail = 'Expected a result\n'.repeat(800);
      render(
        <TestResults
          variant={variant}
          onOpenFile={open}
          results={[{ id: 'search', name: 'search query', state: 'failed', file: path, detail }]}
        />,
      );
      const action = screen.getByRole('button', { name: `Open ${path}` });
      expect(action).toHaveAttribute('data-part', 'icon-button');
      expect(action.parentElement).toContainElement(screen.getByText(path));
      action.focus();
      await userEvent.keyboard('{Enter}');
      expect(open).toHaveBeenCalledExactlyOnceWith(path);
      await userEvent.click(screen.getByRole('button', { name: 'Test details: search query' }));
      const diagnostic = screen.getByRole('group', { name: 'search query diagnostics' });
      expect(diagnostic.tagName).toBe('PRE');
      expect(diagnostic).toHaveAttribute('tabindex', '0');
      diagnostic.focus();
      expect(diagnostic).toHaveFocus();
      expect(diagnostic.textContent).toHaveLength(12_000);
      expect(screen.getByText('0 passed · 1 failed · 1 total')).toBeVisible();
    },
  );

  it('omits test file controls without a host open capability', () => {
    render(
      <TestResults results={[{ id: 'ready', name: 'test', state: 'passed', file: 'test.ts' }]} />,
    );
    expect(screen.queryByRole('button', { name: 'Open test.ts' })).not.toBeInTheDocument();
  });
});
