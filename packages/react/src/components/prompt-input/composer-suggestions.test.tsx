import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PromptInput } from './prompt-input.js';
import { findTrigger } from './composer-suggestions.js';

const commands = [
  { id: 'image', label: 'image', description: 'Create an image' },
  { id: 'search', label: 'search', description: 'Search the web' },
  { id: 'new', label: 'new', description: 'Start a new chat' },
];
const mentions = [
  { id: 'coach', label: 'Writing Coach', description: 'GPT' },
  { id: 'weather', label: 'Weather Desk', description: 'GPT' },
];

function Demo({ onCommand = vi.fn(), onMention = vi.fn(), onSubmit = vi.fn() }) {
  const [value, setValue] = useState('');
  return (
    <PromptInput
      value={value}
      onValueChange={setValue}
      onSubmit={onSubmit}
      commands={commands}
      onCommand={onCommand}
      mentions={mentions}
      onMention={onMention}
    />
  );
}

describe('PromptInput commands and mentions', () => {
  it('finds "/" only at the start and "@" after a space', () => {
    const allow = { commands: true, mentions: true };
    expect(findTrigger('/ima', 4, allow)).toMatchObject({ kind: '/', query: 'ima' });
    expect(findTrigger('see /ima', 8, allow)).toBeUndefined();
    expect(findTrigger('ask @Wea', 8, allow)).toMatchObject({ kind: '@', query: 'Wea', start: 4 });
    expect(findTrigger('mail@example', 12, allow)).toBeUndefined();
  });

  it('filters commands as you type, picks with Enter and removes the typed command', async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn();
    const onSubmit = vi.fn();
    render(<Demo onCommand={onCommand} onSubmit={onSubmit} />);
    const box = screen.getByRole('textbox', { name: 'Message' });
    await user.type(box, '/se');
    const list = screen.getByRole('listbox', { name: 'Commands' });
    expect(list).toHaveTextContent('/search');
    expect(list).not.toHaveTextContent('/image');
    expect(box).toHaveAttribute('aria-activedescendant', screen.getByRole('option').id);
    await user.keyboard('{Enter}');
    expect(onCommand).toHaveBeenCalledWith(expect.objectContaining({ id: 'search' }), '');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(box).toHaveValue('');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('leaves the caret after words the host puts in front for a command', async () => {
    const user = userEvent.setup();
    function Prefill() {
      const [value, setValue] = useState('');
      return (
        <PromptInput
          value={value}
          onValueChange={setValue}
          onSubmit={vi.fn()}
          commands={commands}
          onCommand={(_command, rest) => setValue(`Create an image of ${rest}`)}
        />
      );
    }
    render(<Prefill />);
    const box = screen.getByRole('textbox', { name: 'Message' });
    await user.type(box, '/ima');
    await user.keyboard('{Enter}');
    await user.type(box, 'a red kite');
    expect(box).toHaveValue('Create an image of a red kite');
  });

  it('moves with the arrow keys and inserts a mention', async () => {
    const user = userEvent.setup();
    const onMention = vi.fn();
    render(<Demo onMention={onMention} />);
    const box = screen.getByRole('textbox', { name: 'Message' });
    await user.type(box, 'ask @');
    expect(screen.getAllByRole('option')).toHaveLength(2);
    await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Tab}');
    expect(box).toHaveValue('ask @Weather Desk ');
    expect(onMention).toHaveBeenCalledWith(expect.objectContaining({ id: 'weather' }));
    await user.type(box, 'today');
    expect(box).toHaveValue('ask @Weather Desk today');
  });

  it('closes on Escape, then Enter sends as usual', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Demo onSubmit={onSubmit} />);
    const box = screen.getByRole('textbox', { name: 'Message' });
    await user.type(box, '/new');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('/new');
  });

  it('picks with the mouse without losing focus', async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn();
    render(<Demo onCommand={onCommand} />);
    const box = screen.getByRole('textbox', { name: 'Message' });
    await user.type(box, '/');
    await user.click(screen.getByRole('option', { name: /image/ }));
    expect(onCommand).toHaveBeenCalledWith(expect.objectContaining({ id: 'image' }), '');
    expect(box).toHaveFocus();
  });
});
