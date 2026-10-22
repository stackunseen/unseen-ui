import { render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';
import { TerminalOutput } from '@stackunseen/ui';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it('bounds terminal output and removes ANSI control sequences', () => {
    render(
      <TerminalOutput
        state="unknown"
        output={'discard'.repeat(12000) + '\u001b[31merror\u001b[0m'}
      />,
    );
    expect(screen.getByText('Showing the last 64,000 characters.')).toBeVisible();
    expect(screen.getByRole('group', { name: 'Terminal output' })).toHaveTextContent(/error$/);
    expect(screen.getByRole('group', { name: 'Terminal output' }).textContent).not.toContain(
      '\u001b',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Unknown');
  });
});
