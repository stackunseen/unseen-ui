import { render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';
import { MessageQueue } from '@ai-interaction/react';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it('locks queue edits while acknowledgement is pending', () => {
    render(
      <MessageQueue
        items={[{ id: 'a', version: '1', text: 'Draft', state: 'queued', pending: true }]}
        onEdit={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Edit message 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove message 1' })).toBeDisabled();
  });
});
