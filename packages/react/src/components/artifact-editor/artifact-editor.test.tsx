import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { DocumentSnapshot, EditingCommandState } from '@stackunseen/ui-core/editing';
import { ArtifactEditor } from './artifact-editor.js';
import type { ArtifactDraft, ArtifactEditorInputProps, ArtifactEditorProps } from './types.js';

const document: DocumentSnapshot = {
  documentId: 'report',
  version: 'saved-1',
  text: 'Original report\r\n',
  path: 'report.md',
  language: 'markdown',
};
const draft: ArtifactDraft = {
  ...document,
  version: 'draft-1',
  text: 'Updated report\r\n',
  base: document,
};
const saveCommand = {
  commandId: 'save-1',
  target: { documentId: draft.documentId, version: draft.version },
};
const exportCommand = { ...saveCommand, commandId: 'export-1' };
function props(extra: Partial<ArtifactEditorProps> = {}): ArtifactEditorProps {
  return {
    document,
    draft,
    saveCommand,
    exportCommand,
    onSave: vi.fn(),
    onExport: vi.fn(),
    onDraftChange: vi.fn(),
    ...extra,
  };
}

describe('ArtifactEditor controlled revisions and host commands', () => {
  it.each([
    { saveCommand: { ...saveCommand, target: { ...saveCommand.target, documentId: 'foreign' } } },
    { exportCommand: saveCommand },
  ])('fails closed on foreign targets or shared save/export command IDs', async (commands) => {
    const onSave = vi.fn(),
      onExport = vi.fn();
    render(<ArtifactEditor {...props({ ...commands, onSave, onExport, view: 'edit' })} />);
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await userEvent.click(screen.getByRole('button', { name: 'Export draft' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onExport).not.toHaveBeenCalled();
  });

  it('renders executable-looking source as inert bounded text with a truncation disclosure', () => {
    const text = '<script>globalThis.artifactExecuted = true;</script>' + 'x'.repeat(20_000);
    const { container } = render(<ArtifactEditor {...props({ draft: { ...draft, text } })} />);
    expect(screen.getByRole('region', { name: 'Artifact draft preview' }).textContent).toBe(
      text.slice(0, 20_000),
    );
    expect(screen.getByText(/Preview truncated at 20,000 characters/)).toBeVisible();
    expect(container.querySelector('script')).toBeNull();
  });

  it('defaults to inert bounded draft preview without invoking the optional editor', () => {
    const editor = vi.fn();
    const { container } = render(<ArtifactEditor {...props({ renderEditor: editor })} />);
    expect(editor).not.toHaveBeenCalled();
    expect(screen.getByRole('region', { name: 'Artifact draft preview' })).toHaveTextContent(
      'Updated report',
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute('data-status', 'dirty');
  });

  it('emits an immutable exact save intent once without inferring success', async () => {
    const onSave = vi.fn();
    const { container } = render(<ArtifactEditor {...props({ onSave })} />);
    const button = screen.getByRole('button', { name: 'Save draft' });
    await userEvent.dblClick(button);
    expect(onSave).toHaveBeenCalledExactlyOnceWith({
      kind: 'save',
      ...saveCommand,
      base: { documentId: document.documentId, version: document.version },
      text: draft.text,
    });
    expect(Object.isFrozen(onSave.mock.calls[0]![0])).toBe(true);
    expect(Object.isFrozen(onSave.mock.calls[0]![0].target)).toBe(true);
    expect(container.firstChild).toHaveAttribute('data-status', 'dirty');
    expect(screen.queryByText(/^Saved at/)).not.toBeInTheDocument();
  });

  it('exports the exact current draft independently of saved document text', async () => {
    const onExport = vi.fn();
    render(<ArtifactEditor {...props({ onExport })} />);
    await userEvent.dblClick(screen.getByRole('button', { name: 'Export draft' }));
    expect(onExport).toHaveBeenCalledExactlyOnceWith({
      kind: 'export',
      ...exportCommand,
      document: {
        documentId: draft.documentId,
        version: draft.version,
        text: draft.text,
        path: draft.path,
        language: draft.language,
      },
    });
    expect(Object.isFrozen(onExport.mock.calls[0]![0].document)).toBe(true);
  });

  it('keeps typing controlled and binds changes to the exact draft revision', () => {
    const onDraftChange = vi.fn();
    const values = props({ onDraftChange, view: 'edit' });
    const { rerender } = render(<ArtifactEditor {...values} />);
    const input = screen.getByRole('textbox', { name: 'Artifact draft' });
    fireEvent.change(input, { target: { value: 'New content' } });
    expect(onDraftChange).toHaveBeenCalledExactlyOnceWith({
      target: saveCommand.target,
      text: 'New content',
    });
    expect(input).toHaveValue(draft.text.replace(/\r\n/g, '\n'));
    rerender(
      <ArtifactEditor
        {...values}
        draft={{ ...draft, version: 'draft-2', text: 'New content' }}
        saveCommand={{
          ...saveCommand,
          commandId: 'save-2',
          target: { ...saveCommand.target, version: 'draft-2' },
        }}
        exportCommand={undefined}
      />,
    );
    expect(input).toHaveValue('New content');
  });

  it('rejects obsolete optional-editor changes after revision/access changes and unmount', () => {
    let editorProps: ArtifactEditorInputProps | undefined;
    const renderEditor = (value: ArtifactEditorInputProps) => {
      editorProps = value;
      return <span>Trusted editor</span>;
    };
    const onDraftChange = vi.fn();
    const values = props({ renderEditor, onDraftChange, view: 'edit' });
    const { rerender, unmount } = render(<ArtifactEditor {...values} />);
    const obsolete = editorProps!;
    obsolete.onDocumentChange({
      target: { ...saveCommand.target, version: 'wrong' },
      text: 'Wrong revision',
    });
    obsolete.onDocumentChange({ target: saveCommand.target, text: 'x'.repeat(100_001) });
    expect(onDraftChange).not.toHaveBeenCalled();
    rerender(<ArtifactEditor {...values} access="read-only" />);
    expect(editorProps!.readOnly).toBe(true);
    obsolete.onDocumentChange({ target: saveCommand.target, text: 'Late edit' });
    editorProps!.onDocumentChange({ target: saveCommand.target, text: 'Read-only edit' });
    expect(onDraftChange).not.toHaveBeenCalled();
    rerender(<ArtifactEditor {...values} />);
    const unmounted = editorProps!;
    unmount();
    unmounted.onDocumentChange({ target: saveCommand.target, text: 'After unmount' });
    expect(onDraftChange).not.toHaveBeenCalled();
  });

  it.each(['save', 'export'] as const)('%s pending disables edits and both commands', (kind) => {
    const command = kind === 'save' ? saveCommand : exportCommand;
    const values = props({
      view: 'edit',
      [kind === 'save' ? 'saveState' : 'exportState']: { ...command, status: 'pending' },
    });
    render(<ArtifactEditor {...values} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Export draft' })).toBeDisabled();
    expect(screen.getByText(/awaiting host acknowledgement/)).toBeVisible();
  });

  it('looks up the original unknown save, even after another draft is supplied, without replay', async () => {
    const onLookupReceipt = vi.fn();
    const onSave = vi.fn();
    const unknown: EditingCommandState = { ...saveCommand, status: 'unknown' };
    const values = props({
      onSave,
      onLookupReceipt,
      saveState: unknown,
      draft: { ...draft, version: 'draft-2' },
      saveCommand: {
        ...saveCommand,
        commandId: 'save-2',
        target: { ...saveCommand.target, version: 'draft-2' },
      },
      exportCommand: undefined,
    });
    const { container, rerender } = render(<ArtifactEditor {...values} />);
    expect(container.firstChild).toHaveAttribute('data-status', 'unknown');
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Check save receipt' }));
    expect(onLookupReceipt).toHaveBeenCalledExactlyOnceWith({ kind: 'save', ...saveCommand });
    expect(onSave).not.toHaveBeenCalled();
    rerender(<ArtifactEditor {...values} receiptLookupPending />);
    expect(screen.getByRole('button', { name: 'Check save receipt' })).toBeDisabled();
  });

  it('keeps an interrupted export unknown and looks up its original identity', async () => {
    const onLookupReceipt = vi.fn();
    const values = props({ exportState: { ...exportCommand, status: 'unknown' }, onLookupReceipt });
    render(<ArtifactEditor {...values} />);
    await userEvent.click(screen.getByRole('button', { name: 'Check export receipt' }));
    expect(onLookupReceipt).toHaveBeenCalledExactlyOnceWith({ kind: 'export', ...exportCommand });
    expect(values.onExport).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Export draft' })).toBeDisabled();
  });

  it('does not claim saved until the applied receipt and saved document match', () => {
    const saveState: EditingCommandState = {
      status: 'settled',
      receipt: { ...saveCommand, result: 'applied', nextVersion: 'saved-2' },
    };
    const values = props({ saveState });
    const { container, rerender } = render(<ArtifactEditor {...values} />);
    expect(container.firstChild).toHaveAttribute('data-status', 'saving');
    expect(
      screen.getByText('Save acknowledged; waiting for the matching saved document.'),
    ).toBeVisible();
    expect(screen.queryByText(/^Saved at/)).not.toBeInTheDocument();
    const saved = { ...document, version: 'saved-2', text: draft.text };
    rerender(<ArtifactEditor {...values} document={saved} draft={{ ...draft, base: saved }} />);
    expect(container.firstChild).toHaveAttribute('data-status', 'saved');
    expect(screen.getByText('Saved at revision saved-2.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  });

  it('ignores an old receipt as proof of saving the current draft', () => {
    const saveState: EditingCommandState = {
      status: 'settled',
      receipt: {
        ...saveCommand,
        target: { ...saveCommand.target, version: 'old-draft' },
        result: 'applied',
        nextVersion: document.version,
      },
    };
    const { container } = render(<ArtifactEditor {...props({ saveState })} />);
    expect(container.firstChild).toHaveAttribute('data-status', 'error');
    expect(screen.queryByText(/^Saved at/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  });

  it('preserves host rejection and requires a new command ID for an explicit retry', async () => {
    const onSave = vi.fn();
    const saveState: EditingCommandState = {
      status: 'settled',
      receipt: { ...saveCommand, result: 'rejected', reason: 'Storage unavailable.' },
    };
    const values = props({ onSave, saveState });
    const { container, rerender } = render(<ArtifactEditor {...values} />);
    expect(container.firstChild).toHaveAttribute('data-status', 'error');
    expect(screen.getByRole('alert')).toHaveTextContent('Storage unavailable.');
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    rerender(<ArtifactEditor {...values} saveCommand={{ ...saveCommand, commandId: 'save-2' }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0]![0].commandId).toBe('save-2');
  });

  it('retains a stale draft for inspection but blocks writes after its base changes', () => {
    render(
      <ArtifactEditor
        {...props({
          view: 'edit',
          document: { ...document, version: 'saved-2', text: 'Host changed report' },
        })}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'saved document changed from saved-1 to saved-2',
    );
    expect(screen.getByRole('textbox')).toHaveValue(draft.text.replace(/\r\n/g, '\n'));
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Export draft' })).toBeDisabled();
  });

  it('hides all source and trusted renderers immediately after access is revoked', () => {
    const editor = vi.fn(() => <span>Private rendered source</span>);
    const values = props({ view: 'edit', renderEditor: editor });
    const { rerender } = render(<ArtifactEditor {...values} />);
    expect(editor).toHaveBeenCalledOnce();
    rerender(<ArtifactEditor {...values} access="revoked" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Artifact access revoked');
    expect(screen.queryByText('Private rendered source')).not.toBeInTheDocument();
    expect(screen.queryByText(draft.text)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(editor).toHaveBeenCalledOnce();
  });

  it.each([
    { document: { ...document, text: 'x'.repeat(100_001) } },
    { draft: { ...draft, documentId: 'other-document' } },
    { draft: { ...draft, version: document.version } },
    { draft: { ...draft, base: { documentId: draft.documentId, version: '' } } },
    {
      saveState: {
        status: 'unknown',
        commandId: '',
        target: saveCommand.target,
      } as EditingCommandState,
    },
  ])('hides invalid or oversized revision/command data', (extra) => {
    const editor = vi.fn();
    render(<ArtifactEditor {...props({ ...extra, view: 'edit', renderEditor: editor })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('invalid or exceed');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(editor).not.toHaveBeenCalled();
  });

  it.each(['loading', 'error'] as const)('hides cached source during %s', (state) => {
    const editor = vi.fn();
    render(
      <ArtifactEditor
        {...props({
          view: 'edit',
          renderEditor: editor,
          ...(state === 'loading' ? { loading: true } : { error: 'Read failed.' }),
        })}
      />,
    );
    expect(screen.getByRole(state === 'loading' ? 'status' : 'alert')).toHaveTextContent(
      state === 'loading' ? 'Loading artifact' : 'Read failed.',
    );
    expect(editor).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('uses controlled accessible view changes and reuses CodeDiff without copy actions', async () => {
    const onViewChange = vi.fn();
    const values = props({ onViewChange });
    const { rerender } = render(<ArtifactEditor {...values} />);
    const preview = screen.getByRole('tab', { name: 'Preview' });
    preview.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Edit' })).toHaveFocus();
    expect(onViewChange).toHaveBeenCalledWith('edit');
    expect(preview).toHaveAttribute('aria-selected', 'true');
    rerender(<ArtifactEditor {...values} view="diff" />);
    expect(screen.getByText('report.md')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Copy/ })).not.toBeInTheDocument();
  });

  it('explains missing host commands and keeps save available without a typing callback', () => {
    const { rerender } = render(
      <ArtifactEditor {...props({ saveCommand: undefined, exportCommand: undefined })} />,
    );
    expect(screen.getByText(/Saving is unavailable until/)).toBeVisible();
    expect(screen.getByText(/Export is unavailable until/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    rerender(<ArtifactEditor {...props({ onDraftChange: undefined })} />);
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
  });
});
