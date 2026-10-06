import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConversationDemo } from './conversation-demo.js';
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
describe('local conversation demo host', () => {
  it('retains cancelled drafts, creates an acknowledged branch and restores the original', async () => {
    render(<ConversationDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit message' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit message' }), {
      target: { value: 'My revised question' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Edit message' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Edit message' }));
    expect(screen.getByRole('textbox', { name: 'Edit message' })).toHaveValue(
      'My revised question',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save as new branch' }));
    expect(screen.getByRole('button', { name: 'Save as new branch' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge in local host' }));
    expect(
      within(screen.getByRole('article', { name: 'Original user question' })).getByText(
        'My revised question',
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Conversation branch' }));
    await userEvent.click(screen.getByRole('option', { name: 'Original' }));
    expect(
      within(screen.getByRole('article', { name: 'Original user question' })).getByText(
        'Explain the search function.',
      ),
    ).toBeInTheDocument();
  });
  it('looks up a lost acknowledgement without generating a second attempt', () => {
    render(<ConversationDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Demo options' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Lose local acknowledgement' }));
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge in local host' }));
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Check original request' }));
    expect(
      screen.getByText('Original local receipt found. The action was not repeated.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeEnabled();
  });
  it('keeps missing original receipts unknown after an interrupted request', () => {
    render(<ConversationDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Interrupt before acknowledgement' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check original request' }));
    expect(
      screen.getByText('Original receipt is absent; the outcome remains unknown.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeDisabled();
  });
  it('inserts a precise reference through the controlled composer and queues a local draft', () => {
    render(<ConversationDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Insert source reference' }));
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('@search.ts: search ');
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(screen.getByText('Draft queued locally. No message was sent.')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Queued messages' })).toHaveTextContent(
      '@search.ts: search',
    );
  });
});
