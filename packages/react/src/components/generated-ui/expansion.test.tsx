import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GeneratedUI } from '@ai-interaction/react';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it('rejects generated executable/unknown nodes and binds allowed actions to a surface version', async () => {
    const action = vi.fn();
    const { rerender, container } = render(
      <GeneratedUI
        surface={{
          id: 's',
          version: '1',
          nodes: [{ id: 'x', type: 'html', text: '<script>bad</script>' }],
        }}
        state="ready"
        onAction={action}
      />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('unsupported');
    const surface = {
      id: 's',
      version: '1',
      nodes: [{ id: 'a', type: 'action', label: 'Review', actionId: 'review' }],
    };
    rerender(<GeneratedUI surface={surface} state="ready" onAction={action} />);
    await userEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(action).toHaveBeenCalledWith({ surfaceId: 's', version: '1', actionId: 'review' });
    rerender(<GeneratedUI surface={surface} state="stale" onAction={action} />);
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled();
  });
});
