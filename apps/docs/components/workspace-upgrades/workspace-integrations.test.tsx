import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorView } from '@codemirror/view';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { WorkspaceIntegrations } from './workspace-integrations';

const oldRect = Range.prototype.getBoundingClientRect;
const oldRects = Range.prototype.getClientRects;
beforeAll(() => {
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
  Range.prototype.getBoundingClientRect = () => rect;
  Range.prototype.getClientRects = () =>
    Object.assign([rect], { item: (index: number) => (index === 0 ? rect : null) });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterAll(() => {
  Range.prototype.getBoundingClientRect = oldRect;
  Range.prototype.getClientRects = oldRects;
  vi.unstubAllGlobals();
});
const task = (name: string) => fireEvent.click(screen.getByRole('tab', { name }));
const editor = (name: string) => EditorView.findFromDOM(screen.getByRole('textbox', { name }))!;

describe('persistent workspace presentation', () => {
  it('uses roving keyboard tabs and excludes inactive panels from focus', async () => {
    render(<WorkspaceIntegrations />);
    const first = screen.getByRole('tab', { name: 'Editor' });
    first.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'File review' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('File review');
    expect(screen.queryByRole('textbox', { name: 'src/query.ts' })).not.toBeInTheDocument();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Conversation' })).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(first).toHaveFocus();
    expect(screen.getAllByRole('tab').filter((tab) => tab.tabIndex === 0)).toEqual([first]);
  });

  it('keeps a real editor draft and an unknown edit across repeated task switches', () => {
    render(<WorkspaceIntegrations />);
    act(() => editor('src/query.ts').dispatch({ changes: { from: 14, to: 16, insert: '43' } }));
    task('Conversation');
    task('Editor');
    expect(editor('src/query.ts').state.doc.toString()).toBe(
      'const limit = 43;\nconst order = "desc";\n',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Suggest completion' }));
    fireEvent.click(screen.getByRole('button', { name: 'Accept proposal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simulate lost acknowledgement' }));
    task('Artifact');
    task('Editor');
    expect(screen.getByRole('textbox', { name: 'src/query.ts' })).toHaveAttribute(
      'aria-readonly',
      'true',
    );
    expect(editor('src/query.ts').state.doc.toString()).toBe(
      'const limit = 43;\nconst order = "desc";\n',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Check original edit request' }));
    expect(editor('src/query.ts').state.doc.toString()).toContain('completed locally');
    expect(screen.getByText(/No request was replayed/)).toBeVisible();
  });

  it('retains review options across collapse and unresolved outcomes across navigation', async () => {
    render(<WorkspaceIntegrations />);
    task('File review');
    fireEvent.click(screen.getByRole('button', { name: 'Demo options' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Acknowledgement scenario' }));
    await userEvent.click(screen.getByRole('option', { name: 'Acknowledgement lost' }));
    fireEvent.click(screen.getByRole('button', { name: 'Demo options' }));
    expect(
      screen.queryByRole('combobox', { name: 'Acknowledgement scenario' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apply selected changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deliver local host outcome' }));
    task('Conversation');
    task('File review');
    expect(screen.getByText('Outcome unknown')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Check original command' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Demo options' }));
    expect(screen.getByRole('combobox', { name: 'Acknowledgement scenario' })).toHaveTextContent(
      'Acknowledgement lost',
    );
    expect(screen.getByRole('button', { name: 'New local proposal' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Check original command' }));
    fireEvent.click(screen.getByRole('button', { name: 'New local proposal' }));
    expect(screen.getByRole('button', { name: 'Apply selected changes' })).toBeEnabled();
  });

  it('keeps an inline artifact draft and conflict visible outside collapsed demo options', () => {
    render(<WorkspaceIntegrations />);
    task('Artifact');
    expect(screen.queryByRole('button', { name: 'Open artifact editor' })).not.toBeInTheDocument();
    act(() =>
      editor('Query artifact draft').dispatch({
        changes: {
          from: 0,
          to: editor('Query artifact draft').state.doc.length,
          insert: 'My unsaved artifact\n',
        },
      }),
    );
    task('Editor');
    task('Artifact');
    expect(editor('Query artifact draft').state.doc.toString()).toBe('My unsaved artifact\n');
    fireEvent.click(screen.getByRole('button', { name: 'Demo options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change saved base' }));
    fireEvent.click(screen.getByRole('button', { name: 'Demo options' }));
    expect(screen.getByRole('alert')).toHaveTextContent('saved document changed');
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    task('Conversation');
    task('Artifact');
    expect(editor('Query artifact draft').state.doc.toString()).toBe('My unsaved artifact\n');
  });

  it('keeps composer, source query and edit drafts while hiding duplicate and empty controls', () => {
    render(<WorkspaceIntegrations />);
    task('Conversation');
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), {
      target: { value: 'Unsent draft' },
    });
    expect(screen.queryByRole('group', { name: 'Queued messages' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Browse source context' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Find a reference' }), {
      target: { value: 'search' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Browse source context' }));
    expect(screen.queryByRole('combobox', { name: 'Find a reference' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit message' }));
    expect(screen.queryByRole('button', { name: 'Edit message' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit message' }), {
      target: { value: 'Revised question' },
    });
    task('Editor');
    task('Conversation');
    expect(screen.getByRole('textbox', { name: 'Edit message' })).toHaveValue('Revised question');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Edit message' })).toHaveFocus();
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('Unsent draft');
    fireEvent.click(screen.getByRole('button', { name: 'Browse source context' }));
    expect(screen.getByRole('combobox', { name: 'Find a reference' })).toHaveValue('search');
    const question = screen.getByRole('article', { name: 'Original user question' });
    expect(
      within(question).getByText('Increase the result limit to 20 and sort results ascending.'),
    ).toBeVisible();
  });
});
