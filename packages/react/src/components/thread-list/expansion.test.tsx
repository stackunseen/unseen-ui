import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ThreadList } from '@ai-interaction/react';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it('blocks saving a rename against a changed thread version', async () => {
    const rename = vi.fn(),
      thread = { id: 't', title: 'Review', version: '1' };
    const { rerender } = render(
      <ThreadList
        threads={[thread]}
        query=""
        onQueryChange={() => {}}
        onSelect={() => {}}
        onRename={rename}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Rename Review' }));
    rerender(
      <ThreadList
        threads={[{ ...thread, version: '2' }]}
        query=""
        onQueryChange={() => {}}
        onSelect={() => {}}
        onRename={rename}
      />,
    );
    expect(screen.getByRole('button', { name: 'Save title' })).toBeDisabled();
  });
});
