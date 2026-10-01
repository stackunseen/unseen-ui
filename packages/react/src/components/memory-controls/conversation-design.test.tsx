import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button, MemoryControls } from '@ai-interaction/react';

const memory = {
  id: 'memory-1',
  version: '1',
  label: 'Editor preference',
  value: 'Keep controls compact.',
  scope: 'Workspace',
  state: 'available' as const,
};

describe('conversation design refinements', () => {
  it.each(['list', 'cards', 'compact'] as const)(
    '%s memories request deletion and restore focused host removal to the labeled group',
    async (variant) => {
      const request = vi.fn();
      const { rerender } = render(
        <MemoryControls items={[memory]} onRequest={request} variant={variant} />,
      );
      const action = screen.getByRole('button', { name: `Request deletion of ${memory.label}` });
      action.focus();
      await userEvent.keyboard('{Enter}');
      expect(request).toHaveBeenCalledExactlyOnceWith(memory, 'delete');
      expect(action).toHaveFocus();
      expect(screen.getByText(memory.value)).toBeVisible();
      rerender(<MemoryControls items={[]} onRequest={request} variant={variant} />);
      expect(screen.getByRole('group', { name: 'Saved memory' })).toHaveFocus();
    },
  );

  it('does not steal outside focus when a memory is removed in a host update', () => {
    const renderExample = (items: (typeof memory)[]) => (
      <>
        <MemoryControls items={items} onRequest={() => {}} />
        <Button>Continue in editor</Button>
      </>
    );
    const { rerender } = render(renderExample([memory]));
    screen.getByRole('button', { name: `Request correction for ${memory.label}` }).focus();
    screen.getByRole('button', { name: 'Continue in editor' }).focus();
    rerender(renderExample([]));
    expect(screen.getByRole('button', { name: 'Continue in editor' })).toHaveFocus();
  });

  it('restores a memory that moves outside the bounded visible host window', () => {
    const { rerender } = render(<MemoryControls items={[memory]} onRequest={() => {}} />);
    screen.getByRole('button', { name: `Request deletion of ${memory.label}` }).focus();
    const earlier = Array.from({ length: 100 }, (_, index) => ({
      ...memory,
      id: `earlier-${index}`,
      label: `Earlier ${index}`,
    }));
    rerender(<MemoryControls items={[...earlier, memory]} onRequest={() => {}} />);
    expect(screen.getByRole('group', { name: 'Saved memory' })).toHaveFocus();
  });
});
