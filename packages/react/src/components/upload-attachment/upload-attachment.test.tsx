import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Attachment, componentVariants } from '@ai-interaction/react';
import { UploadAttachment } from '@ai-interaction/react/upload';
import type {
  UploadCheckpoint,
  UploadContext,
  UploadOperation,
} from '@ai-interaction/core/uploads';

const context: UploadContext = {
  workspaceId: 'workspace',
  threadId: 'thread',
  attachmentId: 'report',
  version: '1',
  uploadId: 'upload',
};
function checkpoint(changes: Partial<UploadCheckpoint> = {}): UploadCheckpoint {
  return {
    context: { ...context },
    name: 'report.txt',
    mediaType: 'text/plain',
    sizeBytes: 100,
    receivedBytes: 20,
    sha256: '0'.repeat(64),
    revision: 2,
    state: 'uploading',
    access: 'available',
    capabilities: {
      resume: 'supported',
      cancel: true,
      remove: true,
      maxFileBytes: 1000,
      maxChunkBytes: 50,
      source: 'Local host',
      version: '1',
    },
    ...changes,
  };
}
function unknownOperation(): UploadOperation {
  return {
    command: {
      commandId: 'original-append',
      context: { ...context },
      expectedRevision: 1,
      operation: 'append',
      offset: 0,
      byteLength: 20,
      sha256: '0'.repeat(64),
    },
    state: 'outcome-unknown',
  };
}

describe('controlled upload attachment', () => {
  it('closes an inspected preview on a full upload context change even when file ID/version is unchanged', async () => {
    const value = checkpoint({ state: 'ready', receivedBytes: 100 });
    const { rerender } = render(
      <UploadAttachment
        value={value}
        reference={context}
        preview={{ kind: 'text', text: 'Original workspace content' }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Preview report.txt' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Original workspace content');
    const nextContext = {
      ...context,
      workspaceId: 'another-workspace',
      uploadId: 'another-upload',
    };
    rerender(
      <UploadAttachment
        value={{ ...value, context: nextContext }}
        reference={nextContext}
        preview={{ kind: 'text', text: 'Replacement workspace content' }}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Original workspace content')).not.toBeInTheDocument();
    expect(screen.queryByText('Replacement workspace content')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Preview report.txt' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Replacement workspace content');
  });
  it.each(componentVariants.Attachment)(
    '%s removes host-confirmed deleted content while preserving its unresolved original receipt',
    async (variant) => {
      const lookup = vi.fn();
      const original: UploadOperation = {
        command: {
          commandId: 'original-remove',
          context,
          expectedRevision: 2,
          operation: 'remove',
        },
        state: 'outcome-unknown',
      };
      render(
        <UploadAttachment
          value={checkpoint({ state: 'removed', access: 'missing', revision: 3 })}
          reference={context}
          variant={variant}
          operation={original}
          onRequest={vi.fn()}
          onLookup={lookup}
          onOpen={vi.fn()}
          preview={{ kind: 'image', src: '/private.png', alt: 'Deleted content' }}
        />,
      );
      expect(screen.getByText('Removed')).toBeVisible();
      expect(document.querySelector('img')).toBeNull();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remove report.txt' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open original report.txt' })).toBeDisabled();
      await userEvent.click(
        screen.getByRole('button', { name: 'Check original upload receipt for report.txt' }),
      );
      expect(lookup).toHaveBeenCalledExactlyOnceWith(original.command);
      expect(screen.getByText(/Original upload request outcome unknown/)).toBeVisible();
    },
  );
  it.each(componentVariants.Attachment)(
    '%s binds contextual actions to exact current context and revision without execution',
    async (variant) => {
      const request = vi.fn();
      const value = checkpoint();
      render(
        <UploadAttachment
          value={value}
          reference={context}
          variant={variant}
          onRequest={request}
        />,
      );
      expect(screen.getByRole('progressbar', { name: 'Upload report.txt' })).toHaveAttribute(
        'value',
        '20',
      );
      expect(screen.getByText('Host-confirmed received bytes: 20 of 100.')).toBeVisible();
      await userEvent.click(screen.getByRole('button', { name: 'Upload details for report.txt' }));
      expect(screen.getByText(/Capability source: Local host · version 1/)).toBeVisible();
      await userEvent.click(screen.getByRole('button', { name: 'Resume upload for report.txt' }));
      expect(request).toHaveBeenLastCalledWith({ context, expectedRevision: 2, action: 'resume' });
      await userEvent.click(screen.getByRole('button', { name: 'Cancel upload for report.txt' }));
      expect(request).toHaveBeenLastCalledWith({ context, expectedRevision: 2, action: 'cancel' });
      await userEvent.click(screen.getByRole('button', { name: 'Remove report.txt' }));
      expect(request).toHaveBeenLastCalledWith({ context, expectedRevision: 2, action: 'remove' });
      expect(screen.getByText('Uploading')).toBeVisible();
      expect(Object.isFrozen(value)).toBe(false);
      expect(Object.isFrozen(request.mock.calls[0]![0].context)).toBe(true);
    },
  );
  it.each(componentVariants.Attachment)(
    '%s retains unknown original outcome through later ready checkpoints and allows original lookup',
    async (variant) => {
      const request = vi.fn(),
        lookup = vi.fn(),
        open = vi.fn();
      const operation = unknownOperation();
      const { rerender } = render(
        <UploadAttachment
          value={checkpoint()}
          reference={context}
          variant={variant}
          operation={operation}
          onRequest={request}
          onLookup={lookup}
          onOpen={open}
        />,
      );
      expect(screen.getByRole('button', { name: 'Resume upload for report.txt' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel upload for report.txt' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Remove report.txt' })).toBeDisabled();
      await userEvent.click(
        screen.getByRole('button', { name: 'Refresh upload status for report.txt' }),
      );
      expect(request).toHaveBeenCalledExactlyOnceWith({
        context,
        expectedRevision: 2,
        action: 'refresh',
      });
      rerender(
        <UploadAttachment
          value={checkpoint({ state: 'ready', receivedBytes: 100, revision: 7 })}
          reference={context}
          variant={variant}
          operation={operation}
          onRequest={request}
          onLookup={lookup}
          onOpen={open}
        />,
      );
      expect(screen.getByText('Ready')).toBeVisible();
      expect(screen.getByText(/Original upload request outcome unknown/)).toBeVisible();
      const check = screen.getByRole('button', {
        name: 'Check original upload receipt for report.txt',
      });
      check.focus();
      await userEvent.keyboard('{Enter}');
      expect(lookup).toHaveBeenCalledExactlyOnceWith(operation.command);
      expect(check).toHaveFocus();
      expect(screen.getByText(/Original upload request outcome unknown/)).toBeVisible();
      await userEvent.click(screen.getByRole('button', { name: 'Open original report.txt' }));
      expect(open).toHaveBeenCalledExactlyOnceWith({ context, expectedRevision: 7 });
    },
  );
  it.each(componentVariants.Attachment)(
    '%s keeps unsupported and unknown resume capability explicit',
    (variant) => {
      const value = checkpoint();
      const { rerender } = render(
        <UploadAttachment
          value={{ ...value, capabilities: { ...value.capabilities, resume: 'unknown' } }}
          reference={context}
          variant={variant}
          onRequest={vi.fn()}
        />,
      );
      expect(screen.getByText(/Resume support unknown/)).toBeVisible();
      expect(screen.getByRole('button', { name: 'Resume upload for report.txt' })).toBeDisabled();
      rerender(
        <UploadAttachment
          value={{ ...value, capabilities: { ...value.capabilities, resume: 'unsupported' } }}
          reference={context}
          variant={variant}
          onRequest={vi.fn()}
        />,
      );
      expect(screen.getByText(/Resume unsupported/)).toBeVisible();
      expect(screen.getByRole('button', { name: 'Resume upload for report.txt' })).toBeDisabled();
    },
  );
  it.each(componentVariants.Attachment)(
    '%s treats full committed bytes and received command as separate from ready',
    (variant) => {
      const operation = { ...unknownOperation(), state: 'acknowledged' as const };
      render(
        <UploadAttachment
          value={checkpoint({ receivedBytes: 100 })}
          reference={context}
          variant={variant}
          operation={operation}
          onRequest={vi.fn()}
        />,
      );
      expect(screen.getByText(/Waiting for confirmation/)).toBeVisible();
      expect(screen.getByText('Uploading')).toBeVisible();
      expect(screen.queryByText('Ready')).not.toBeInTheDocument();
      expect(screen.getByText(/Checkpoint lifecycle is reported separately/)).toBeVisible();
      expect(screen.getByRole('button', { name: 'Resume upload for report.txt' })).toBeDisabled();
    },
  );
  it.each(componentVariants.Attachment)(
    '%s suppresses stale/loading progress and mutation while keeping valid reconciliation scope',
    (variant) => {
      const props = {
        value: checkpoint(),
        reference: context,
        variant,
        onRequest: vi.fn(),
        onLookup: vi.fn(),
        operation: unknownOperation(),
      };
      const { rerender } = render(<UploadAttachment {...props} stale />);
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.getByText(/Upload checkpoint stale/)).toBeVisible();
      expect(screen.getByRole('button', { name: 'Resume upload for report.txt' })).toBeDisabled();
      expect(
        screen.getByRole('button', { name: 'Check original upload receipt for report.txt' }),
      ).toBeEnabled();
      rerender(<UploadAttachment {...props} loading />);
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Refresh upload status for report.txt' }),
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: 'Check original upload receipt for report.txt' }),
      ).toBeDisabled();
    },
  );
  it.each(componentVariants.Attachment)(
    '%s repairs owned action focus after host state removes its upload action',
    async (variant) => {
      const request = vi.fn();
      const { rerender } = render(
        <UploadAttachment
          value={checkpoint({ state: 'selected', receivedBytes: 0, revision: 0 })}
          reference={context}
          variant={variant}
          onRequest={request}
        />,
      );
      screen.getByRole('button', { name: 'Upload report.txt' }).focus();
      await userEvent.keyboard('{Enter}');
      expect(request).toHaveBeenCalledExactlyOnceWith({
        context,
        expectedRevision: 0,
        action: 'upload',
      });
      rerender(
        <UploadAttachment
          value={checkpoint()}
          reference={context}
          variant={variant}
          onRequest={request}
        />,
      );
      expect(screen.getByRole('group', { name: 'Upload report.txt' })).toHaveFocus();
    },
  );
  it('does not steal outside focus when the host updates an upload', () => {
    const renderExample = (value: UploadCheckpoint) => (
      <>
        <UploadAttachment value={value} reference={context} onRequest={vi.fn()} />
        <button>Continue in editor</button>
      </>
    );
    const { rerender } = render(
      renderExample(checkpoint({ state: 'selected', receivedBytes: 0, revision: 0 })),
    );
    screen.getByRole('button', { name: 'Upload report.txt' }).focus();
    screen.getByRole('button', { name: 'Continue in editor' }).focus();
    rerender(renderExample(checkpoint()));
    expect(screen.getByRole('button', { name: 'Continue in editor' })).toHaveFocus();
  });
  it('rejects invalid byte data, checkpoint identity, operation identity and accessors before requesting actions', () => {
    const request = vi.fn(),
      lookup = vi.fn();
    const { rerender } = render(
      <UploadAttachment
        value={checkpoint({ receivedBytes: 101 })}
        reference={context}
        onRequest={request}
        onLookup={lookup}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Upload checkpoint is invalid');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(
      <UploadAttachment
        value={checkpoint()}
        reference={{ ...context, uploadId: 'different' }}
        onRequest={request}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    const operation = unknownOperation();
    rerender(
      <UploadAttachment
        value={checkpoint()}
        reference={context}
        operation={{
          ...operation,
          command: { ...operation.command, context: { ...context, workspaceId: 'different' } },
        }}
        onRequest={request}
        onLookup={lookup}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('another resource');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    const getter = vi.fn(() => operation.command);
    const unsafe = {
      get command() {
        return getter();
      },
      state: 'outcome-unknown' as const,
    };
    rerender(
      <UploadAttachment
        value={checkpoint()}
        reference={context}
        operation={unsafe}
        onRequest={request}
        onLookup={lookup}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid or excessive upload operation');
    expect(getter).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
  });
  it('does not fabricate a percentage for an empty file or clear unknown without a lookup callback', () => {
    render(
      <UploadAttachment
        value={checkpoint({ sizeBytes: 0, receivedBytes: 0 })}
        reference={context}
        operation={unknownOperation()}
      />,
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('Empty file. Waiting for host final confirmation.')).toBeVisible();
    expect(screen.getByText(/Original receipt lookup is unavailable here/)).toBeVisible();
    expect(
      screen.queryByRole('group', { name: 'Upload actions for report.txt' }),
    ).not.toBeInTheDocument();
  });
});

describe('canonical attachment terminal states and previews', () => {
  it.each(componentVariants.Attachment)(
    '%s removes obsolete content and actions immediately when host state is removed',
    async (variant) => {
      const open = vi.fn();
      const remove = vi.fn();
      const props = {
        variant,
        name: 'report.png',
        reference: { attachmentId: 'report', version: '1' },
        resource: { attachmentId: 'report', version: '1' },
        preview: { kind: 'image' as const, src: '/report.png', alt: 'Report preview' },
        onOpen: open,
        onRemove: remove,
      };
      const { rerender } = render(<Attachment {...props} state="ready" />);
      await userEvent.click(screen.getByRole('button', { name: 'Preview report.png' }));
      expect(within(screen.getByRole('dialog')).getByAltText('Report preview')).toBeVisible();
      rerender(<Attachment {...props} state="removed" />);
      expect(document.querySelectorAll('img')).toHaveLength(0);
      expect(screen.getByRole('dialog')).toHaveTextContent('Attachment has been removed');
      await userEvent.keyboard('{Escape}');
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Inspect report.png' })).toHaveFocus(),
      );
      expect(screen.getByRole('button', { name: 'Open original' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Remove report.png' })).toBeDisabled();
      expect(open).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
    },
  );
  it.each(componentVariants.Attachment)(
    '%s states host cancellation without inventing ready or retry state',
    (variant) => {
      render(
        <Attachment
          variant={variant}
          name="draft.txt"
          state="cancelled"
          progress={{ loaded: 100, total: 100 }}
          onOpen={vi.fn()}
          onRetry={vi.fn()}
        />,
      );
      expect(screen.getByRole('status')).toHaveTextContent('Upload cancelled');
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Retry upload' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open original' })).toBeDisabled();
    },
  );
  it('exposes the bounded text preview as a named keyboard scrolling surface', async () => {
    render(
      <Attachment
        name="review.txt"
        state="ready"
        preview={{ kind: 'text', text: '<script>inert</script>\n' + 'line\n'.repeat(5000) }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Preview review.txt' }));
    const preview = screen.getByRole('region', { name: 'review.txt text preview' });
    expect(preview).toHaveAttribute('tabindex', '0');
    expect(preview.textContent).toHaveLength(20000);
    expect(preview.querySelector('script')).toBeNull();
    preview.focus();
    expect(preview).toHaveFocus();
  });
  it('exposes the bounded audio transcript as a separate named keyboard scrolling surface', async () => {
    render(
      <Attachment
        name="recording.wav"
        state="ready"
        preview={{ kind: 'audio', src: '/recording.wav', transcript: 'word '.repeat(5000) }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Preview recording.wav' }));
    const transcript = screen.getByRole('region', { name: 'recording.wav transcript' });
    expect(transcript).toHaveAttribute('tabindex', '0');
    expect(transcript.textContent).toHaveLength(20000);
    transcript.focus();
    expect(transcript).toHaveFocus();
  });
});
