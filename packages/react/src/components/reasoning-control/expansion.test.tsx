import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReasoningControl } from '@ai-interaction/react';
import { efforts } from '../../../../../apps/docs/lib/coding-fixtures';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it('maps slider keys to supported effort IDs', async () => {
    const change = vi.fn();
    render(<ReasoningControl options={efforts} value="medium" onValueChange={change} />);
    const slider = screen.getByRole('slider');
    slider.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(change).toHaveBeenCalledWith('high');
    expect(slider).toHaveAttribute('aria-valuetext', 'Medium');
  });
});
