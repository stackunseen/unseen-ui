import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { EditorView } from '@codemirror/view';
import { diagnosticCount } from '@codemirror/lint';
import { syntaxTree } from '@codemirror/language';
import { CodeEditor } from './code-editor.js';
import type { CodeEditorProps, CodeEditorProposal } from './code-editor-types.js';
import { proposalIssue, validSelection } from './code-editor-model.js';

const document = {
  documentId: 'source-1',
  version: 'r1',
  text: 'const answer = 41;\n',
  language: 'typescript',
  path: 'answer.ts',
};
const proposal: CodeEditorProposal = {
  proposalId: 'suggestion-1',
  version: 'p1',
  target: { documentId: 'source-1', version: 'r1' },
  kind: 'selection-edit',
  edits: [
    { range: { from: 15, to: 17 }, insert: '42' },
    { range: { from: 18, to: 18 }, insert: '// checked\n' },
  ],
};
const rect = {
  left: 0,
  top: 0,
  right: 100,
  bottom: 20,
  width: 100,
  height: 20,
  x: 0,
  y: 0,
  toJSON: () => ({}),
};
const oldRect = Range.prototype.getBoundingClientRect;
const oldRects = Range.prototype.getClientRects;
beforeAll(() => {
  // jsdom has no range geometry; the actual EditorView, commands and state are used.
  Range.prototype.getBoundingClientRect = () => rect;
  Range.prototype.getClientRects = () =>
    Object.assign([rect], { item: (index: number) => (index === 0 ? rect : null) });
});
afterAll(() => {
  Range.prototype.getBoundingClientRect = oldRect;
  Range.prototype.getClientRects = oldRects;
});
function editor(): EditorView {
  return EditorView.findFromDOM(screen.getByRole('textbox'))!;
}
function props(overrides: Partial<CodeEditorProps> = {}): CodeEditorProps {
  return { document, onChange: vi.fn(), ...overrides };
}

describe('optional CodeEditor with real CodeMirror', () => {
  it('preserves CRLF text and host offsets through real controlled typing and diagnostics', () => {
    const snapshot = { ...document, text: 'a\r\nb\r\n' };
    const onChange = vi.fn();
    const rendered = render(
      <CodeEditor
        {...props({
          document: snapshot,
          onChange,
          selection: { anchor: 3, head: 4 },
          diagnostics: [
            {
              id: 'd',
              target: snapshot,
              range: { from: 3, to: 4 },
              severity: 'warning',
              message: 'Check b',
            },
          ],
        })}
      />,
    );
    expect(editor().state.doc.toString()).toBe('a\nb\n');
    expect(editor().state.selection.main.anchor).toBe(2);
    expect(diagnosticCount(editor().state)).toBe(1);
    act(() =>
      editor().dispatch({ changes: { from: 2, to: 3, insert: 'x' }, selection: { anchor: 3 } }),
    );
    expect(onChange).toHaveBeenCalledWith({
      target: { documentId: snapshot.documentId, version: snapshot.version },
      text: 'a\r\nx\r\n',
      edits: [{ range: { from: 3, to: 4 }, insert: 'x' }],
      selection: { anchor: 4, head: 4 },
    });
    rendered.rerender(
      <CodeEditor
        {...props({
          document: { ...snapshot, version: 'r2', text: 'a\r\nx\r\n' },
          onChange,
          selection: { anchor: 4, head: 4 },
        })}
      />,
    );
    expect(editor().state.doc.toString()).toBe('a\nx\n');
    act(() => editor().dispatch({ changes: { from: 3, insert: '\n' }, selection: { anchor: 4 } }));
    expect(onChange.mock.calls.at(-1)![0].text).toBe('a\r\nx\r\n\r\n');
    expect(validSelection({ anchor: 2, head: 2 }, snapshot.text)).toBe(false);
  });
  it('previews one completion inline and requests a Unicode-safe next-word prefix', () => {
    const onProposalIntent = vi.fn();
    const completion: CodeEditorProposal = {
      ...proposal,
      kind: 'completion',
      edits: [{ range: { from: 18, to: 18 }, insert: '😀 first second' }],
    };
    const rendered = render(<CodeEditor {...props({ proposal: completion, onProposalIntent })} />);
    expect(rendered.container.querySelector('.cm-completion-preview')?.textContent).toBe(
      '😀 first second',
    );
    expect(editor().state.doc.toString()).toBe(document.text);
    fireEvent.click(screen.getByRole('button', { name: 'Accept next word' }));
    expect(onProposalIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'partial-accept',
        editIndices: [0],
        acceptedPrefix: 3,
        edits: [{ range: { from: 18, to: 18 }, insert: '😀 ' }],
      }),
    );
    expect(editor().state.doc.toString()).toBe(document.text);
    fireEvent.click(screen.getByRole('button', { name: 'Accept proposal' }));
    expect(onProposalIntent).toHaveBeenCalledTimes(1);
  });
  it('treats intentional prose as plain editing without a missing-syntax warning', () => {
    render(<CodeEditor {...props({ document: { ...document, language: 'plain' } })} />);
    expect(screen.queryByText(/syntax support is unavailable/)).toBeNull();
  });
  it('uses a labelled CodeMirror surface with language parsing and no textarea substitution', () => {
    const rendered = render(<CodeEditor {...props()} />);
    expect(screen.getByRole('textbox', { name: 'answer.ts' })).toHaveAttribute(
      'aria-multiline',
      'true',
    );
    expect(rendered.container.querySelector('.cm-editor')).not.toBeNull();
    expect(rendered.container.querySelector('textarea')).toBeNull();
    expect(editor().state.doc.toString()).toBe(document.text);
    expect(syntaxTree(editor().state).length).toBe(document.text.length);
  });
  it('emits exact draft edits without changing controlled text before the host responds', () => {
    const onChange = vi.fn();
    const rendered = render(
      <CodeEditor {...props({ onChange, selection: { anchor: 17, head: 17 } })} />,
    );
    act(() =>
      editor().dispatch({ changes: { from: 15, to: 17, insert: '42' }, selection: { anchor: 17 } }),
    );
    expect(onChange).toHaveBeenCalledWith({
      target: { documentId: 'source-1', version: 'r1' },
      text: 'const answer = 42;\n',
      edits: [{ range: { from: 15, to: 17 }, insert: '42' }],
      selection: { anchor: 17, head: 17 },
    });
    expect(editor().state.doc.toString()).toBe(document.text);
    rendered.rerender(
      <CodeEditor
        {...props({
          onChange,
          document: { ...document, version: 'r2', text: 'const answer = 42;\n' },
          selection: { anchor: 17, head: 17 },
        })}
      />,
    );
    expect(editor().state.doc.toString()).toBe('const answer = 42;\n');
    expect(onChange).toHaveBeenCalledTimes(1);
  });
  it('routes Enter typing through draft callbacks while Tab exits without a trap', () => {
    const onChange = vi.fn();
    render(<CodeEditor {...props({ onChange })} />);
    const surface = screen.getByRole('textbox');
    act(() => editor().focus());
    fireEvent.keyDown(surface, { key: 'Enter', code: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(editor().state.doc.toString()).toBe(document.text);
    const tab = new KeyboardEvent('keydown', {
      key: 'Tab',
      code: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    surface.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
  });
  it('preserves controlled selection direction and emits keyboard selection changes', () => {
    const onSelectionChange = vi.fn();
    const rendered = render(
      <CodeEditor {...props({ selection: { anchor: 0, head: 0 }, onSelectionChange })} />,
    );
    act(() => editor().focus());
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'ArrowRight', shiftKey: true });
    expect(onSelectionChange).toHaveBeenCalledWith({
      target: { documentId: 'source-1', version: 'r1' },
      selection: { anchor: 0, head: 1 },
    });
    expect(editor().state.selection.main.head).toBe(0);
    rendered.rerender(
      <CodeEditor {...props({ selection: { anchor: 5, head: 2 }, onSelectionChange })} />,
    );
    expect(editor().state.selection.main.anchor).toBe(5);
    expect(editor().state.selection.main.head).toBe(2);
  });
  it('preserves the typing cursor after host acknowledgement when selection is transient', () => {
    const onChange = vi.fn();
    const rendered = render(<CodeEditor {...props({ onChange })} />);
    act(() => editor().dispatch({ selection: { anchor: 7 } }));
    act(() => editor().dispatch({ changes: { from: 7, insert: 'Z' }, selection: { anchor: 8 } }));
    const request = onChange.mock.calls[0]![0];
    rendered.rerender(
      <CodeEditor
        {...props({ onChange, document: { ...document, version: 'r2', text: request.text } })}
      />,
    );
    expect(editor().state.selection.main.head).toBe(8);
  });
  it('fails closed if a host reuses a document revision for different text', () => {
    const onChange = vi.fn(),
      onProposalIntent = vi.fn();
    const rendered = render(<CodeEditor {...props({ proposal, onChange, onProposalIntent })} />);
    rendered.rerender(
      <CodeEditor
        {...props({
          proposal,
          onChange,
          onProposalIntent,
          document: { ...document, text: 'const answer = 99;\n' },
        })}
      />,
    );
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-readonly', 'true');
    expect(screen.getByText('Document text changed without a new revision')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Accept proposal' })).toBeDisabled();
    act(() => editor().dispatch({ changes: { from: 0, insert: 'x' } }));
    expect(onChange).not.toHaveBeenCalled();
    rendered.rerender(
      <CodeEditor
        {...props({
          onChange,
          document: { ...document, version: 'r2', text: 'const answer = 99;\n' },
        })}
      />,
    );
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-readonly', 'false');
  });
  it.each(['loading', 'unsupported', 'stale', 'conflict', 'error'] as const)(
    'keeps %s document copyable and read-only',
    (status) => {
      const onChange = vi.fn(),
        onProposalIntent = vi.fn();
      render(<CodeEditor {...props({ status, onChange, proposal, onProposalIntent })} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-readonly', 'true');
      act(() => editor().dispatch({ changes: { from: 0, insert: 'x' } }));
      expect(editor().state.doc.toString()).toBe(document.text);
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Accept proposal' })).toBeDisabled();
    },
  );
  it('blocks native/command editing and proposal shortcuts when read-only', () => {
    const onChange = vi.fn(),
      onProposalIntent = vi.fn();
    render(<CodeEditor {...props({ readOnly: true, onChange, proposal, onProposalIntent })} />);
    act(() => editor().focus());
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', ctrlKey: true });
    act(() => editor().dispatch({ changes: { from: 0, insert: 'x' } }));
    expect(onChange).not.toHaveBeenCalled();
    expect(onProposalIntent).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveAttribute('contenteditable', 'false');
  });
  it('binds full acceptance to proposal identity/version and waits for host text', () => {
    const onProposalIntent = vi.fn();
    render(<CodeEditor {...props({ proposal, onProposalIntent })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Accept proposal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Accept proposal' }));
    expect(onProposalIntent).toHaveBeenCalledTimes(1);
    expect(onProposalIntent).toHaveBeenCalledWith({
      type: 'accept',
      proposalId: 'suggestion-1',
      proposalVersion: 'p1',
      target: proposal.target,
      editIndices: [0, 1],
      edits: proposal.edits,
    });
    expect(editor().state.doc.toString()).toBe(document.text);
  });
  it('binds partial acceptance to one whole edit and does not mutate the original proposal', () => {
    const onProposalIntent = vi.fn();
    render(<CodeEditor {...props({ proposal, onProposalIntent })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Accept edit 2' }));
    const intent = onProposalIntent.mock.calls[0]![0];
    expect(intent).toEqual({
      type: 'partial-accept',
      proposalId: 'suggestion-1',
      proposalVersion: 'p1',
      target: proposal.target,
      editIndices: [1],
      edits: [proposal.edits[1]],
    });
    expect(intent.edits[0]).not.toBe(proposal.edits[1]);
    expect(editor().state.doc.toString()).toBe(document.text);
  });
  it.each([
    ['Enter', { ctrlKey: true }, 'accept', [0, 1]],
    ['ArrowRight', { altKey: true }, 'partial-accept', [0]],
    ['Escape', {}, 'dismiss', []],
  ] as const)(
    'supports the %s proposal shortcut without applying its text',
    (key, modifiers, type, indices) => {
      const onProposalIntent = vi.fn();
      render(<CodeEditor {...props({ proposal, onProposalIntent })} />);
      act(() => editor().focus());
      fireEvent.keyDown(screen.getByRole('textbox'), { key, ...modifiers });
      expect(onProposalIntent).toHaveBeenCalledWith(
        expect.objectContaining({ type, editIndices: indices }),
      );
      expect(editor().state.doc.toString()).toBe(document.text);
    },
  );
  it.each(['pending', 'unknown'] as const)(
    'blocks repeated or keyboard edits during %s and never silently replays',
    (status) => {
      const onChange = vi.fn(),
        onProposalIntent = vi.fn();
      const p = props({ proposal, onChange, onProposalIntent });
      const rendered = render(<CodeEditor {...p} />);
      fireEvent.click(screen.getByRole('button', { name: 'Accept proposal' }));
      rendered.rerender(
        <CodeEditor
          {...p}
          commandState={{ status, commandId: 'command-1', target: proposal.target }}
        />,
      );
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', ctrlKey: true });
      act(() => editor().dispatch({ changes: { from: 0, insert: 'x' } }));
      expect(screen.getByRole('button', { name: 'Accept proposal' })).toBeDisabled();
      expect(onChange).not.toHaveBeenCalled();
      rendered.rerender(<CodeEditor {...p} commandState={{ status: 'idle' }} />);
      fireEvent.click(screen.getByRole('button', { name: 'Accept proposal' }));
      expect(onProposalIntent).toHaveBeenCalledTimes(1);
    },
  );
  it('checks the exact original unknown request without resubmitting the proposal', () => {
    const onLookupOriginal = vi.fn(),
      onProposalIntent = vi.fn();
    render(
      <CodeEditor
        {...props({
          proposal,
          onLookupOriginal,
          onProposalIntent,
          commandState: { status: 'unknown', commandId: 'original-1', target: proposal.target },
        })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Check original edit request' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check original edit request' }));
    expect(onLookupOriginal).toHaveBeenCalledTimes(2);
    expect(onLookupOriginal).toHaveBeenCalledWith({
      commandId: 'original-1',
      target: proposal.target,
    });
    expect(onProposalIntent).not.toHaveBeenCalled();
    expect(screen.getByText(/outcome unknown/i)).toBeVisible();
  });
  it('puts original recovery immediately after its warning and first in the unknown-state keyboard order', async () => {
    const onLookupOriginal = vi.fn(),
      onProposalIntent = vi.fn();
    render(
      <CodeEditor
        {...props({
          proposal,
          onLookupOriginal,
          onProposalIntent,
          commandState: { status: 'unknown', commandId: 'original-1', target: proposal.target },
        })}
      />,
    );
    const warning = screen.getByText(/Edit outcome unknown/);
    const lookup = screen.getByRole('button', { name: 'Check original edit request' });
    expect(warning.nextElementSibling).toContainElement(lookup);
    const user = userEvent.setup();
    await user.tab();
    expect(lookup).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onLookupOriginal).toHaveBeenCalledOnce();
    expect(onLookupOriginal).toHaveBeenCalledWith({
      commandId: 'original-1',
      target: proposal.target,
    });
    expect(onProposalIntent).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Accept proposal' })).toBeDisabled();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-readonly', 'true');
  });
  it.each([
    { ...proposal, target: { ...proposal.target, version: 'old' } },
    {
      ...proposal,
      edits: [
        { range: { from: 0, to: 5 }, insert: 'x' },
        { range: { from: 2, to: 6 }, insert: 'y' },
      ],
    },
    { ...proposal, edits: [{ range: { from: 19, to: 20 }, insert: 'x' }] },
    { ...proposal, edits: [{ range: { from: 0, to: 0 }, insert: 'x'.repeat(100_001) }] },
  ])('fails closed for stale, overlapping, invalid and excess proposals', (bad) => {
    const onProposalIntent = vi.fn();
    render(<CodeEditor {...props({ proposal: bad, onProposalIntent })} />);
    expect(screen.getByRole('button', { name: 'Accept proposal' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Accept proposal' }));
    expect(onProposalIntent).not.toHaveBeenCalled();
  });
  it('consumes a blocked proposal shortcut without falling through to draft newline insertion', () => {
    const onChange = vi.fn(),
      onProposalIntent = vi.fn();
    render(
      <CodeEditor
        {...props({
          onChange,
          onProposalIntent,
          proposal: { ...proposal, target: { ...proposal.target, version: 'old' } },
        })}
      />,
    );
    act(() => editor().focus());
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', ctrlKey: true });
    expect(onChange).not.toHaveBeenCalled();
    expect(onProposalIntent).not.toHaveBeenCalled();
  });
  it('reflects host lookup activity and permits another original read after it fails', () => {
    const onLookupOriginal = vi.fn();
    const p = props({
      onLookupOriginal,
      commandState: { status: 'unknown', commandId: 'original', target: proposal.target },
    });
    const rendered = render(<CodeEditor {...p} lookupPending />);
    expect(screen.getByRole('button', { name: 'Checking original edit request' })).toBeDisabled();
    rendered.rerender(<CodeEditor {...p} lookupPending={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Check original edit request' }));
    expect(onLookupOriginal).toHaveBeenCalledWith({
      commandId: 'original',
      target: proposal.target,
    });
  });
  it('withholds diagnostics after revision change and never evaluates diagnostic HTML', () => {
    const diagnostics = [
      {
        id: 'lint-1',
        target: proposal.target,
        range: { from: 15, to: 17 },
        severity: 'warning' as const,
        message: '<script>throw 1</script>',
      },
    ];
    const rendered = render(<CodeEditor {...props({ diagnostics })} />);
    expect(diagnosticCount(editor().state)).toBe(1);
    expect(screen.getByRole('list', { name: 'Document diagnostics' })).toHaveTextContent(
      '<script>throw 1</script>',
    );
    expect(rendered.container.querySelector('script')).toBeNull();
    rendered.rerender(
      <CodeEditor {...props({ document: { ...document, version: 'r2' }, diagnostics })} />,
    );
    expect(diagnosticCount(editor().state)).toBe(0);
    expect(screen.getByText(/1 stale, invalid or excess diagnostics withheld/)).toBeVisible();
  });
  it('shows unrelated/rejected receipts without inventing an applied document', () => {
    const rendered = render(
      <CodeEditor
        {...props({
          commandState: {
            status: 'settled',
            receipt: {
              commandId: 'old',
              target: { documentId: 'other', version: 'r1' },
              result: 'applied',
              nextVersion: 'r2',
            },
          },
        })}
      />,
    );
    expect(screen.getByText('That confirmation is for a different revision.')).toBeVisible();
    rendered.rerender(
      <CodeEditor
        {...props({
          commandState: {
            status: 'settled',
            receipt: {
              commandId: 'failed',
              target: proposal.target,
              result: 'rejected',
              reason: 'Access revoked',
            },
          },
        })}
      />,
    );
    expect(screen.getByText('Edit rejected: Access revoked')).toBeVisible();
    expect(editor().state.doc.toString()).toBe(document.text);
  });
  it('uses plain text for unsupported syntax and refuses oversized/identityless documents', () => {
    const rendered = render(
      <CodeEditor {...props({ document: { ...document, language: 'python' } })} />,
    );
    expect(screen.getByText(/Plain-text editing/)).toBeVisible();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-readonly', 'false');
    rendered.rerender(
      <CodeEditor {...props({ document: { ...document, text: 'x'.repeat(100_001) } })} />,
    );
    expect(screen.queryByRole('textbox')).toBeNull();
    rendered.rerender(<CodeEditor {...props({ document: { ...document, version: '' } })} />);
    expect(screen.queryByRole('textbox')).toBeNull();
  });
  it('destroys each view on document switch and unmount', () => {
    const destroy = vi.spyOn(EditorView.prototype, 'destroy');
    const rendered = render(<CodeEditor {...props()} />);
    const first = editor();
    rendered.rerender(
      <CodeEditor
        {...props({ document: { ...document, documentId: 'source-2', text: 'second' } })}
      />,
    );
    expect(editor()).not.toBe(first);
    expect(destroy).toHaveBeenCalledTimes(1);
    rendered.unmount();
    expect(destroy).toHaveBeenCalledTimes(2);
    destroy.mockRestore();
  });
  it('prevents a disposed view from emitting stale callbacks', () => {
    const onChange = vi.fn(),
      onSelectionChange = vi.fn();
    const rendered = render(<CodeEditor {...props({ onChange, onSelectionChange })} />);
    const disposed = editor();
    rendered.unmount();
    act(() => disposed.dispatch({ changes: { from: 0, insert: 'stale' } }));
    act(() => disposed.dispatch({ selection: { anchor: 1 } }));
    expect(onChange).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
  it('reports initialization failure and destroys a partially initialized view', () => {
    const update = vi.spyOn(EditorView.prototype, 'update').mockImplementationOnce(() => {
      throw new Error('initial diagnostic setup failed');
    });
    const destroy = vi.spyOn(EditorView.prototype, 'destroy');
    const rendered = render(<CodeEditor {...props()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('The editor could not be initialized.');
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(rendered.container.querySelector('.cm-editor')).toBeNull();
    update.mockRestore();
    destroy.mockRestore();
  });
  it('rejects selections and edits splitting surrogate pairs', () => {
    expect(validSelection({ anchor: 1, head: 1 }, '😀')).toBe(false);
    expect(
      proposalIssue(
        { ...document, text: '😀' },
        { ...proposal, edits: [{ range: { from: 1, to: 2 }, insert: 'x' }] },
      ),
    ).toBe('Proposal has invalid or overlapping edits');
    render(
      <CodeEditor
        {...props({ document: { ...document, text: '😀' }, selection: { anchor: 1, head: 1 } })}
      />,
    );
    expect(screen.getByText('Selection is invalid for this revision.')).toBeVisible();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-readonly', 'true');
  });
});
