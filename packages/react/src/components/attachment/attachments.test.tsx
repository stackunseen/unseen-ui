import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  Attachment,
  AttachmentGroup,
  AttachmentPicker,
  PromptInput,
  componentVariants,
} from '@stackunseen/ui';

describe('controlled attachment composition', () => {
  it('keeps an unknown upload outcome separate from failure and ready state', () => {
    render(
      <Attachment name="file.txt" state="outcome-unknown" onRetry={vi.fn()} onOpen={vi.fn()} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Upload outcome unknown');
    expect(screen.queryByRole('button', { name: 'Retry upload' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open original' })).toBeDisabled();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
  it('keeps preview controls and dialogs labelled when the host omits a display name', async () => {
    render(<Attachment name=" " state="ready" preview={{ kind: 'text', text: 'File content' }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Preview Unnamed file' }));
    expect(screen.getByRole('dialog', { name: 'Unnamed file' })).toBeVisible();
  });
  it.each(componentVariants.Attachment)(
    '%s preserves host state through retry/removal requests',
    async (variant) => {
      const retry = vi.fn(),
        remove = vi.fn();
      const { rerender } = render(
        <Attachment
          variant={variant}
          name="review.csv"
          state="failed"
          onRetry={retry}
          onRemove={remove}
        />,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Retry upload' }));
      expect(retry).toHaveBeenCalledOnce();
      expect(screen.getByText('Upload failed')).toBeVisible();
      await userEvent.click(screen.getByRole('button', { name: 'Remove review.csv' }));
      expect(remove).toHaveBeenCalledOnce();
      rerender(
        <Attachment
          variant={variant}
          name="review.csv"
          state="removing"
          onRetry={retry}
          onRemove={remove}
        />,
      );
      expect(screen.getByRole('button', { name: 'Remove review.csv' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Retry upload' })).not.toBeInTheDocument();
    },
  );
  it.each([
    { loaded: NaN, total: 10 },
    { loaded: 12, total: 10 },
    { loaded: 0, total: 0 },
    { loaded: -1, total: 10 },
    { loaded: 1, total: Infinity },
  ])('does not invent progress for invalid counts %j', (progress) => {
    render(<Attachment name="review.csv" state="uploading" progress={progress} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('Upload progress unavailable')).toBeVisible();
  });
  it('keeps the final byte distinct from host acknowledgement', () => {
    const { rerender } = render(
      <Attachment name="file.txt" state="uploading" progress={{ loaded: 1024, total: 1024 }} />,
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1024');
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      '1.0 KiB of 1.0 KiB · Waiting for confirmation',
    );
    expect(screen.getByText(/Waiting for confirmation/)).toBeVisible();
    expect(screen.queryByText('Ready')).not.toBeInTheDocument();
    rerender(<Attachment name="file.txt" state="ready" progress={{ loaded: 1024, total: 1024 }} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeVisible();
  });
  it.each(componentVariants.Attachment)(
    '%s describes measured bytes accessibly and removes progress when access is revoked',
    (variant) => {
      const props = {
        variant,
        name: 'review.csv',
        state: 'uploading' as const,
        progress: { loaded: 512, total: 2048 },
      };
      const { rerender } = render(<Attachment {...props} />);
      expect(screen.getByRole('progressbar', { name: 'Upload review.csv' })).toHaveAttribute(
        'aria-valuetext',
        '512 B of 2.0 KiB',
      );
      rerender(<Attachment {...props} access="revoked" />);
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Access revoked');
    },
  );
  it.each(['revoked', 'expired', 'missing'] as const)(
    'blocks %s content and host open actions',
    async (access) => {
      const open = vi.fn();
      render(
        <Attachment
          name="private.txt"
          state="ready"
          access={access}
          preview={{ kind: 'text', text: 'Restricted content' }}
          onOpen={open}
        />,
      );
      expect(screen.getByRole('button', { name: 'Open original' })).toBeDisabled();
      await userEvent.click(screen.getByRole('button', { name: 'Inspect private.txt' }));
      expect(screen.getByRole('dialog')).not.toHaveTextContent('Restricted content');
      expect(screen.getByRole('dialog')).toHaveTextContent(`Access ${access}`);
      expect(open).not.toHaveBeenCalled();
    },
  );
  it('removes media immediately on revocation while retaining close and focus return', async () => {
    const base = {
      name: 'report.png',
      state: 'ready' as const,
      preview: {
        kind: 'image' as const,
        src: 'https://example.com/report.png',
        alt: 'Report preview',
      },
    };
    const { rerender } = render(<Attachment {...base} />);
    await userEvent.click(screen.getByRole('button', { name: 'Preview report.png' }));
    expect(within(screen.getByRole('dialog')).getByAltText('Report preview')).toBeVisible();
    rerender(<Attachment {...base} access="revoked" />);
    expect(document.querySelectorAll('img')).toHaveLength(0);
    expect(screen.getByRole('dialog')).toHaveTextContent('Content is unavailable');
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Inspect report.png' })).toHaveFocus(),
    );
  });
  it.each([
    'javascript:alert(1)',
    'data:image/svg+xml,<svg/>',
    '//example.com/private.png',
    'https://user:pass@example.com/a.png',
    'blob:null/file',
    '/\\example.com/a.png',
    ' https://example.com/a.png',
  ])('rejects preview source %s', async (src) => {
    render(
      <Attachment name="image.png" state="ready" preview={{ kind: 'image', src, alt: 'Image' }} />,
    );
    expect(document.querySelector('img')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Preview image.png' }));
    expect(within(screen.getByRole('dialog')).getByText(/Preview unavailable/)).toBeVisible();
    expect(document.querySelector('img')).toBeNull();
  });
  it('recovers a failed image when the host supplies a new URL', async () => {
    const { rerender } = render(
      <Attachment
        name="image.png"
        state="ready"
        preview={{ kind: 'image', src: '/first.png', alt: 'Report' }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Preview image.png' }));
    fireEvent.error(within(screen.getByRole('dialog')).getByAltText('Report'));
    expect(screen.getByRole('dialog')).toHaveTextContent('Preview unavailable');
    rerender(
      <Attachment
        name="image.png"
        state="ready"
        preview={{ kind: 'image', src: '/second.png', alt: 'Report' }}
      />,
    );
    expect(within(screen.getByRole('dialog')).getByAltText('Report')).toHaveAttribute(
      'src',
      '/second.png',
    );
  });
  it('renders bounded text as inert content', async () => {
    render(
      <Attachment
        name="payload.txt"
        state="ready"
        preview={{ kind: 'text', text: '<script>alert(1)</script>' + 'x'.repeat(20000) }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Preview payload.txt' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('script')).toBeNull();
    expect(dialog.querySelector('pre')?.textContent).toHaveLength(20000);
    expect(dialog).toHaveTextContent('Preview limited to 20,000 characters');
  });
  it('supports compound parts and an explicit empty group', () => {
    render(
      <AttachmentGroup>
        <Attachment.Root name="note.txt" state="uploading">
          <Attachment.Info />
          <Attachment.Progress />
        </Attachment.Root>
      </AttachmentGroup>,
    );
    expect(screen.getByRole('group', { name: 'Attachments' })).toHaveTextContent('note.txt');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    render(<AttachmentGroup label="Empty draft" />);
    expect(screen.getByRole('group', { name: 'Empty draft' })).toHaveTextContent('No attachments');
  });
  it('discloses bounded audio transcripts without autoplay', async () => {
    render(
      <Attachment
        name="recording.wav"
        state="ready"
        preview={{ kind: 'audio', src: '/recording.wav', transcript: 'x'.repeat(20001) }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Preview recording.wav' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('pre')?.textContent).toHaveLength(20000);
    expect(dialog).toHaveTextContent('Transcript preview limited to 20,000 characters');
    expect(dialog.querySelector('audio')).not.toHaveAttribute('autoplay');
    expect(dialog.querySelector('audio')).toHaveAttribute('preload', 'none');
  });
  it('keeps video available when a caption track fails, but falls back for a media failure', async () => {
    render(
      <Attachment
        name="clip.mp4"
        state="ready"
        preview={{
          kind: 'video',
          src: '/clip.mp4',
          captions: { src: '/captions.vtt', language: 'en', label: 'English' },
        }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Preview clip.mp4' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.error(dialog.querySelector('track')!);
    expect(dialog).toHaveTextContent('Captions unavailable');
    expect(dialog.querySelector('video')).toBeInTheDocument();
    fireEvent.error(dialog.querySelector('video')!);
    expect(dialog).toHaveTextContent('Preview unavailable');
    expect(dialog.querySelector('video')).toBeNull();
  });
});

describe('file selection and composer slots', () => {
  it('rejects invalid types, sizes and excess files while delegating valid files', async () => {
    const selected = vi.fn(),
      rejected = vi.fn();
    const { container } = render(
      <AttachmentPicker
        accept=".txt"
        maxFileBytes={4}
        remainingSlots={1}
        onFilesSelected={selected}
        onReject={rejected}
      />,
    );
    const files = [
      new File(['ok'], 'notes.txt', { type: 'text/plain' }),
      new File(['x'], 'extra.txt'),
      new File(['12345'], 'large.txt'),
      new File(['x'], 'no.exe'),
    ];
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { files } });
    expect(selected).toHaveBeenCalledWith([files[0]]);
    expect(rejected.mock.calls[0]?.[0].map((item: { reason: string }) => item.reason)).toEqual([
      'count',
      'size',
      'type',
    ]);
    expect(screen.getByRole('status')).toHaveTextContent('3 files not added');
    fireEvent.change(input, { target: { files: [files[0]] } });
    expect(selected).toHaveBeenCalledTimes(2);
    expect(input.value).toBe('');
  });
  it('blocks selection after available slots or policy configuration become invalid', () => {
    const selected = vi.fn();
    const { container, rerender } = render(
      <AttachmentPicker remainingSlots={0} onFilesSelected={selected} />,
    );
    expect(screen.getByRole('button', { name: 'Add files' })).toBeDisabled();
    fireEvent.change(container.querySelector('input')!, {
      target: { files: [new File(['x'], 'x.txt')] },
    });
    expect(selected).not.toHaveBeenCalled();
    rerender(<AttachmentPicker maxFileBytes={NaN} onFilesSelected={selected} />);
    expect(screen.getByRole('button', { name: 'Add files' })).toBeDisabled();
  });
  it.each(componentVariants.PromptInput)(
    '%s supports attachment-only submit only when the host explicitly permits it',
    (variant) => {
      const submit = vi.fn();
      const base = {
        variant,
        value: '',
        onValueChange: () => {},
        onSubmit: submit,
        attachments: <Attachment name="file.txt" state="selected" />,
      };
      const { rerender } = render(<PromptInput {...base} />);
      expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
      rerender(
        <PromptInput
          {...base}
          allowEmptySubmit
          submitDisabled
          submitDisabledReason="Wait for the host upload."
        />,
      );
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
      expect(submit).not.toHaveBeenCalled();
      expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Wait for the host upload.');
      rerender(<PromptInput {...base} allowEmptySubmit />);
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
      expect(submit).toHaveBeenCalledWith('');
    },
  );
});
