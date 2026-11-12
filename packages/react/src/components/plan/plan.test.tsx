import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Plan } from './plan.js';

const steps = [
  { id: 'a', label: 'Read the schema', done: true },
  { id: 'b', label: 'Write the migration' },
];

describe('Plan', () => {
  it('lists steps in order and says which are done', () => {
    render(<Plan title="Migrate billing" description="Two steps" steps={steps} headingLevel={2} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Migrate billing' })).toBeVisible();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Read the schema (done)');
    expect(items[0]).toHaveAttribute('data-state', 'complete');
    expect(items[1]).toHaveAttribute('data-state', 'pending');
    expect(items[1]).not.toHaveTextContent('(done)');
  });

  it('hides and shows the steps and reports the change', async () => {
    const onOpenChange = vi.fn();
    render(<Plan title="Migrate billing" steps={steps} onOpenChange={onOpenChange} />);
    const toggle = screen.getByRole('button', { name: 'Hide plan steps' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(toggle);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole('button', { name: 'Show plan steps' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('marks a streaming plan busy and offers no toggle before steps arrive', () => {
    const { container, rerender } = render(<Plan title="Drafting" streaming />);
    expect(container.querySelector('[data-part="plan"]')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
    rerender(<Plan title="Drafting" actions={<button type="button">Build</button>} />);
    expect(container.querySelector('[data-part="plan"]')).not.toHaveAttribute('aria-busy');
    expect(screen.getByRole('button', { name: 'Build' })).toBeVisible();
  });
});
