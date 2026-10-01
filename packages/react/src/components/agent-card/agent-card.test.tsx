import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AgentCard } from './agent-card.js';
import { componentVariants } from '../../shared/variants.js';

describe('AgentCard controlled presentation', () => {
  it.each(componentVariants.AgentCard)(
    '%s keeps inspection intent separate from host selection and lifecycle',
    async (variant) => {
      const user = userEvent.setup();
      const inspect = vi.fn();
      const props = {
        variant,
        name: 'Research assistant',
        description: 'Collects public source material.',
        state: 'running' as const,
        activity: 'Reading the handbook.',
        onSelect: inspect,
      };
      const { rerender } = render(<AgentCard {...props} />);
      const action = screen.getByRole('button', { name: 'Inspect agent' });
      expect(action).toHaveAttribute('type', 'button');
      expect(action).toHaveAttribute('aria-pressed', 'false');
      await user.tab();
      expect(action).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(inspect).toHaveBeenCalledOnce();
      expect(action).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByText('Running')).toBeVisible();
      expect(screen.getByText('Reading the handbook.')).toBeVisible();

      rerender(<AgentCard {...props} selected state="paused" activity="Waiting for host input." />);
      expect(action).toHaveFocus();
      expect(action).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('Paused')).toBeVisible();
      expect(screen.queryByText('Reading the handbook.')).not.toBeInTheDocument();
      await user.keyboard(' ');
      expect(inspect).toHaveBeenCalledTimes(2);
      expect(action).toHaveAttribute('aria-pressed', 'true');

      rerender(<AgentCard {...props} selected onSelect={undefined} activity={undefined} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.getByText('Research assistant')).toBeVisible();
      expect(screen.getByText('Collects public source material.')).toBeVisible();
      expect(screen.queryByText('Waiting for host input.')).not.toBeInTheDocument();
    },
  );

  it.each(componentVariants.AgentCard)('%s renders host content as inert text', (variant) => {
    const { container } = render(
      <AgentCard
        variant={variant}
        name={'<script>agent()</script>'}
        description={'<img src=x onerror=agent()>'}
        activity={'<a href="javascript:agent()">inspect</a>'}
        state="failed"
      />,
    );
    expect(screen.getByText('<script>agent()</script>')).toBeVisible();
    expect(screen.getByText('<img src=x onerror=agent()>')).toBeVisible();
    expect(screen.getByText('<a href="javascript:agent()">inspect</a>')).toBeVisible();
    expect(screen.getByText('Failed')).toBeVisible();
    expect(container.querySelector('script, img, a')).toBeNull();
  });
});
