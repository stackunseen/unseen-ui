import { fireEvent, render, screen } from '@testing-library/react';
import { createRef, useState } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PromptInput } from './prompt-input.js';

describe('controlled composer selection', () => {
  it('keeps the caret moving forward while a controlled host accepts typed text', async () => {
    function Host() {
      const [value, setValue] = useState('');
      const [selection, setSelection] = useState({ from: 0, to: 0 });
      return (
        <PromptInput
          value={value}
          onValueChange={setValue}
          onSubmit={() => {}}
          selection={selection}
          onSelectionChange={setSelection}
        />
      );
    }
    render(<Host />);
    await userEvent.type(screen.getByRole('textbox'), 'ordered text');
    expect(screen.getByRole('textbox')).toHaveValue('ordered text');
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).selectionStart).toBe(12);
  });
  it('exposes the textarea ref and selection without mutating controlled text', () => {
    const ref = createRef<HTMLTextAreaElement>(),
      select = vi.fn(),
      change = vi.fn();
    const { rerender, unmount } = render(
      <PromptInput
        textareaRef={ref}
        value="A🙂B"
        onValueChange={change}
        onSubmit={vi.fn()}
        selection={{ from: 1, to: 3 }}
        onSelectionChange={select}
      />,
    );
    expect(ref.current).toBe(screen.getByRole('textbox'));
    expect(ref.current?.selectionStart).toBe(1);
    expect(ref.current?.selectionEnd).toBe(3);
    fireEvent.select(ref.current!);
    expect(select).toHaveBeenCalledWith({ from: 1, to: 3 });
    expect(change).not.toHaveBeenCalled();
    rerender(
      <PromptInput
        textareaRef={ref}
        value="A🙂B"
        onValueChange={change}
        onSubmit={vi.fn()}
        selection={{ from: 2, to: 3 }}
      />,
    );
    expect(ref.current?.selectionStart).toBe(1);
    unmount();
    expect(ref.current).toBeNull();
  });
});
