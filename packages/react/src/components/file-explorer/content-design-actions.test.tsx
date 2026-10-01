import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileExplorer } from './file-explorer.js';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => vi.unstubAllGlobals());

describe('contextual content actions', () => {
  it.each(['folders', 'list', 'compact'] as const)(
    '%s file refresh stays with the title and page actions keep exact controlled scope',
    async (variant) => {
      const refresh = vi.fn();
      const page = vi.fn();
      const context = { workspaceId: 'project', version: 'window-2' };
      const common = {
        variant,
        files: [{ id: 'file', path: 'search.ts', version: 'file-1' }],
        expandedPaths: [],
        onSelect: vi.fn(),
        onRefresh: refresh,
        onPageChange: page,
        pagination: { pageIndex: 1, pageSize: 1, hasNextPage: true },
      };
      const { rerender } = render(<FileExplorer {...common} context={context} />);
      const action = screen.getByRole('button', { name: 'Refresh file window' });
      expect(action).toHaveAttribute('data-part', 'icon-button');
      expect(action.parentElement).toContainElement(screen.getByText('Workspace files'));
      expect(action).toHaveAttribute('type', 'button');
      const pagination = screen.getByRole('group', { name: 'File window pagination' });
      await userEvent.click(within(pagination).getByRole('button', { name: 'Previous file page' }));
      expect(page).toHaveBeenLastCalledWith(0, context);
      await userEvent.click(within(pagination).getByRole('button', { name: 'Next file page' }));
      expect(page).toHaveBeenLastCalledWith(2, context);
      expect(screen.getByText(/Page 2/)).toBeVisible();
      await userEvent.click(action);
      expect(refresh).toHaveBeenLastCalledWith(context);
      const nextContext = { ...context, version: 'window-3' };
      rerender(<FileExplorer {...common} context={nextContext} />);
      await userEvent.click(screen.getByRole('button', { name: 'Refresh file window' }));
      expect(refresh).toHaveBeenLastCalledWith(nextContext);
    },
  );
});
