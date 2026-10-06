import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MentionPicker } from '@stackunseen/ui';
import { references } from '../../../../../apps/docs/lib/coding-fixtures';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it('selects reference identity and version, keeping revoked options disabled', async () => {
    const select = vi.fn();
    render(
      <MentionPicker items={references} query="" onQueryChange={() => {}} onSelect={select} />,
    );
    await userEvent.click(screen.getByRole('option', { name: /src\/search.ts.*Search query/ }));
    expect(select).toHaveBeenCalledWith(references[0]);
    expect(screen.getByRole('option', { name: /private.env/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});
