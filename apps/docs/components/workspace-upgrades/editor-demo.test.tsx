import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EditorView } from '@codemirror/view';
import { EditorDemo } from './editor-demo';

function editor(): EditorView {
  return EditorView.findFromDOM(screen.getByRole('textbox', { name: 'answer.ts' }))!;
}
describe('local editor demo host', () => {
  it('advances draft revisions only in the controlled local host', () => {
    render(<EditorDemo />);
    act(() =>
      editor().dispatch({ changes: { from: 15, to: 17, insert: '42' }, selection: { anchor: 17 } }),
    );
    expect(editor().state.doc.toString()).toBe('const answer = 42;\n');
    expect(screen.getByText('draft-2')).toBeVisible();
    expect(screen.getByText(/Nothing was saved/)).toBeVisible();
  });
  it('keeps proposal text unchanged while pending and resolves the original lost acknowledgement', () => {
    render(<EditorDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Suggest selection edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Accept proposal' }));
    expect(editor().state.doc.toString()).toBe('const answer = 41;\n');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-readonly', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Simulate lost acknowledgement' }));
    expect(editor().state.doc.toString()).toBe('const answer = 41;\n');
    fireEvent.click(screen.getByRole('button', { name: 'Check original edit request' }));
    expect(editor().state.doc.toString()).toBe('const answer = 42;\n// Reviewed locally\n');
    expect(screen.getByText(/No request was replayed/)).toBeVisible();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-readonly', 'false');
  });
  it('applies one chosen edit after a host acknowledgement and rejects without mutation', () => {
    render(<EditorDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Suggest selection edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Accept edit 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm locally' }));
    expect(editor().state.doc.toString()).toBe('const answer = 42;\n');
    fireEvent.click(screen.getByRole('button', { name: 'Suggest completion' }));
    fireEvent.click(screen.getByRole('button', { name: 'Accept proposal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject locally' }));
    expect(editor().state.doc.toString()).toBe('const answer = 42;\n');
    expect(screen.getByText(/Host rejected the edit: Simulated host rejection/)).toBeVisible();
  });
});
