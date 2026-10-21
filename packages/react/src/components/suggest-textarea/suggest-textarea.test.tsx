import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SuggestTextarea } from './suggest-textarea.js';

function Demo({ onAccept = () => {} }: { onAccept?: (value: string) => void }) {
  const [value, setValue] = useState('Thanks for the ');
  const [dismissed, setDismissed] = useState(false);
  // A stand-in completion: suggest only for this exact text, as a host would after asking a model.
  const suggestion =
    !dismissed && value === 'Thanks for the ' ? 'update on the launch.' : undefined;
  return (
    <>
      <SuggestTextarea
        aria-label="Reply"
        value={value}
        onValueChange={(next) => {
          setValue(next);
          setDismissed(false);
        }}
        suggestion={suggestion}
        onAccept={onAccept}
        onDismiss={() => setDismissed(true)}
      />
      <button type="button">Send</button>
    </>
  );
}

describe('SuggestTextarea', () => {
  it('shows ghost text when focused at the end and accepts it with Tab', async () => {
    const user = userEvent.setup();
    const accept = vi.fn();
    const { container } = render(<Demo onAccept={accept} />);
    const area = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Reply' });
    expect(container.querySelector('[data-suggesting]')).toBeNull();
    await user.click(area);
    area.setSelectionRange(area.value.length, area.value.length);
    area.dispatchEvent(new Event('select', { bubbles: true }));
    expect(await screen.findByText('update on the launch.')).toBeInTheDocument();
    expect(area).toHaveAccessibleDescription(
      'Suggestion: update on the launch.. Press Tab to accept or Escape to dismiss.',
    );
    await user.keyboard('{Tab}');
    expect(area).toHaveValue('Thanks for the update on the launch.');
    expect(accept).toHaveBeenCalledWith('Thanks for the update on the launch.');
    expect(area).toHaveFocus();
  });

  it('lets Escape dismiss, after which Tab moves focus as usual', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const area = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Reply' });
    await user.click(area);
    area.setSelectionRange(area.value.length, area.value.length);
    area.dispatchEvent(new Event('select', { bubbles: true }));
    await screen.findByText('update on the launch.');
    await user.keyboard('{Escape}');
    expect(screen.queryByText('update on the launch.')).toBeNull();
    await user.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'Send' })).toHaveFocus();
    expect(area).toHaveValue('Thanks for the ');
  });

  it('hides the suggestion while the caret is not at the end', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const area = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Reply' });
    await user.click(area);
    area.setSelectionRange(area.value.length, area.value.length);
    await user.keyboard('{ArrowRight}');
    await screen.findByText('update on the launch.');
    await user.keyboard('{ArrowLeft}');
    expect(screen.queryByText('update on the launch.')).toBeNull();
    await user.keyboard('{Tab}');
    expect(area).toHaveValue('Thanks for the ');
  });
});
