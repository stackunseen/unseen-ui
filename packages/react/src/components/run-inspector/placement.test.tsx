import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IconsProvider, RunInspector } from '@stackunseen/ui';
import type { RunSpan } from '@stackunseen/ui';

describe('execution content and contextual actions', () => {
  it.each(['accordion', 'cards', 'compact'] as const)(
    '%s span inspection uses a named local icon and sends the original span',
    async (variant) => {
      const inspect = vi.fn();
      const span: RunSpan = {
        id: 'read',
        name: 'Read the release checklist',
        kind: 'tool',
        state: 'complete',
      };
      render(<RunInspector variant={variant} runId="run" spans={[span]} onSelect={inspect} />);
      if (variant === 'accordion')
        await userEvent.click(
          screen.getByRole('button', { name: /Read the release checklist · complete/ }),
        );
      const action = screen.getByRole('button', {
        name: 'Inspect span: Read the release checklist',
      });
      expect(screen.getAllByText(/complete/)).toHaveLength(1);
      expect(screen.getByText('Duration: Not measured')).toBeVisible();
      expect(action).toHaveAttribute('data-part', 'icon-button');
      await userEvent.click(action);
      expect(inspect).toHaveBeenCalledExactlyOnceWith(span);
    },
  );

  it('span inspection remains visible if its decorative icon is hidden', () => {
    render(
      <IconsProvider icons={{ search: null }}>
        <RunInspector
          variant="compact"
          runId="run"
          spans={[{ id: 'read', name: 'Search documents', kind: 'tool', state: 'running' }]}
          onSelect={() => {}}
        />
      </IconsProvider>,
    );
    expect(
      screen.getByRole('button', { name: 'Inspect span: Search documents' }),
    ).toHaveTextContent('Inspect span: Search documents');
  });
});
