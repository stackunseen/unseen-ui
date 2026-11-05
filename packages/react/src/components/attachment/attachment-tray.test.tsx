import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PromptInput } from '../prompt-input/prompt-input.js';
import { AttachmentTray } from './attachment-tray.js';

const files = [
  {
    id: 'notes',
    name: 'notes.csv',
    state: 'uploading' as const,
    mediaType: 'text/csv',
    sizeBytes: 4000,
    progress: { loaded: 1000, total: 4000 },
  },
  {
    id: 'brief',
    name: 'brief.pdf',
    state: 'failed' as const,
    detail: 'The connection dropped.',
  },
];

describe('AttachmentTray', () => {
  it('shows measured progress, and asks the host to retry or remove one file', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onRemove = vi.fn();
    render(<AttachmentTray items={files} onRetry={onRetry} onRemove={onRemove} />);
    expect(screen.getByRole('progressbar', { name: 'Upload notes.csv' })).toHaveValue(1000);
    expect(screen.getByText('The connection dropped.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Retry upload' }));
    expect(onRetry).toHaveBeenCalledWith('brief');
    await user.click(screen.getByRole('button', { name: 'Remove notes.csv' }));
    expect(onRemove).toHaveBeenCalledWith('notes');
    expect(screen.getByText('notes.csv')).toBeVisible();
  });

  it('renders nothing until the host supplies a file', () => {
    const { container } = render(<AttachmentTray items={[]} onRemove={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('sits in the composer slot', () => {
    render(
      <PromptInput
        value=""
        onValueChange={() => {}}
        onSubmit={() => {}}
        attachments={<AttachmentTray items={files.slice(0, 1)} />}
      />,
    );
    expect(screen.getByRole('list', { name: /Attachments, 1 of 1/ })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeVisible();
  });

  it('shows the first 20 files and says how many remain', () => {
    const items = Array.from({ length: 21 }, (_, index) => ({
      id: `f${index}`,
      name: `file-${index}.txt`,
      state: 'ready' as const,
    }));
    render(<AttachmentTray items={items} />);
    expect(screen.getByText('file-0.txt')).toBeVisible();
    expect(screen.queryByText('file-20.txt')).toBeNull();
    expect(screen.getByText('Showing 20 of 21 files.')).toBeVisible();
  });
});
