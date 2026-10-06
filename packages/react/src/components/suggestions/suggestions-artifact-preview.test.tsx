import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Suggestions } from '@stackunseen/ui';

afterEach(() => vi.restoreAllMocks());

describe('Suggestions direct behavior', () => {
  it.each(['chips', 'cards', 'list'] as const)(
    '%s omits an empty or blank-only prompt group',
    (variant) => {
      const select = vi.fn();
      const { rerender } = render(<Suggestions variant={variant} items={[]} onSelect={select} />);
      expect(screen.queryByRole('group', { name: 'Suggested prompts' })).toBeNull();
      rerender(<Suggestions variant={variant} items={['', '  ', '\n']} onSelect={select} />);
      expect(screen.queryByRole('group', { name: 'Suggested prompts' })).toBeNull();
      expect(screen.queryByRole('button')).toBeNull();
      expect(select).not.toHaveBeenCalled();
    },
  );

  it.each(['chips', 'cards', 'list'] as const)(
    '%s preserves repeated prompts and their focus through host reordering without key warnings',
    (variant) => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const select = vi.fn();
      const { rerender } = render(
        <Suggestions variant={variant} items={['Alpha', 'Beta', 'Alpha']} onSelect={select} />,
      );
      const repeated = screen.getAllByRole('button', { name: 'Alpha' });
      expect(repeated).toHaveLength(2);
      repeated[1]!.focus();
      rerender(
        <Suggestions
          variant={variant}
          items={['Beta', 'Alpha', 'Gamma', 'Alpha']}
          onSelect={select}
        />,
      );
      expect(screen.getAllByRole('button', { name: 'Alpha' })[1]).toBe(repeated[1]);
      expect(repeated[1]).toHaveFocus();
      expect(screen.getAllByRole('button')).toHaveLength(4);
      expect(error).not.toHaveBeenCalled();
      expect(select).not.toHaveBeenCalled();
    },
  );

  it.each(['fill', 'send'] as const)(
    '%s requests exactly one selection per keyboard activation without submitting its parent form',
    async (mode) => {
      const select = vi.fn();
      const submit = vi.fn((event) => event.preventDefault());
      render(
        <form onSubmit={submit}>
          <Suggestions items={['  Explain the result  ']} mode={mode} onSelect={select} />
        </form>,
      );
      const group = screen.getByRole('group', { name: 'Suggested prompts' });
      const prompt = within(group).getByRole('button', { name: 'Explain the result' });
      expect(select).not.toHaveBeenCalled();
      await userEvent.tab();
      expect(prompt).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      expect(select).toHaveBeenCalledExactlyOnceWith('  Explain the result  ', mode);
      await userEvent.keyboard(' ');
      expect(select).toHaveBeenCalledTimes(2);
      expect(select).toHaveBeenLastCalledWith('  Explain the result  ', mode);
      expect(submit).not.toHaveBeenCalled();
    },
  );

  it('keeps disabled prompts unavailable and uses the latest mode/callback after host updates', async () => {
    const oldSelect = vi.fn();
    const currentSelect = vi.fn();
    const { rerender } = render(<Suggestions items={['Explain']} disabled onSelect={oldSelect} />);
    const prompt = screen.getByRole('button', { name: 'Explain' });
    expect(prompt).toBeDisabled();
    await userEvent.click(prompt);
    await userEvent.tab();
    expect(prompt).not.toHaveFocus();
    expect(oldSelect).not.toHaveBeenCalled();
    rerender(<Suggestions items={['Explain', 'Summarize']} mode="send" onSelect={currentSelect} />);
    expect(screen.getByRole('button', { name: 'Explain' })).toBe(prompt);
    prompt.focus();
    await userEvent.keyboard('{Enter}');
    expect(currentSelect).toHaveBeenCalledExactlyOnceWith('Explain', 'send');
    expect(oldSelect).not.toHaveBeenCalled();
  });

  it('ignores blank prompts while keeping meaningful content inert and callbacks literal', async () => {
    const select = vi.fn();
    const text = '<img src=x onerror="alert(1)">';
    const { container } = render(<Suggestions items={['', text, '   ']} onSelect={select} />);
    const prompt = screen.getByRole('button', { name: text });
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(container.querySelector('img,script')).toBeNull();
    await userEvent.click(prompt);
    expect(select).toHaveBeenCalledExactlyOnceWith(text, 'fill');
  });
});
