import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FileExplorer } from '@ai-interaction/react';
import { files } from '../../../../../apps/docs/lib/coding-fixtures';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it('uses controlled folder expansion and file permission guards', async () => {
    const expand = vi.fn(),
      select = vi.fn();
    const { rerender } = render(
      <FileExplorer
        files={files}
        expandedPaths={[]}
        onExpandedPathsChange={expand}
        onSelect={select}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'src 2 files' }));
    expect(expand).toHaveBeenCalledWith(['/src']);
    rerender(
      <FileExplorer
        files={files}
        expandedPaths={['/src']}
        onExpandedPathsChange={expand}
        onSelect={select}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open src/search.ts' }));
    expect(select).toHaveBeenCalledWith(files[0]);
    expect(screen.getByRole('button', { name: 'Open private.env' })).toBeDisabled();
  });
});
