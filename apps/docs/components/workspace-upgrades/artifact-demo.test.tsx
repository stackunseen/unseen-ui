import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorView } from '@codemirror/view';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ArtifactDemo, artifactDemoTransition, createArtifactDemo } from './artifact-demo.js';
import type { ArtifactExportIntent, ArtifactSaveIntent } from '@stackunseen/ui/artifact-editor';

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
  // jsdom has no range geometry. The composition uses the actual CodeMirror editor/state.
  Range.prototype.getBoundingClientRect = () => rect;
  Range.prototype.getClientRects = () =>
    Object.assign([rect], { item: (index: number) => (index === 0 ? rect : null) });
});
afterAll(() => {
  Range.prototype.getBoundingClientRect = oldRect;
  Range.prototype.getClientRects = oldRects;
});
function save(state: ReturnType<typeof createArtifactDemo>): ArtifactSaveIntent {
  return {
    kind: 'save',
    commandId: `artifact-save-${state.sequence}`,
    target: { documentId: state.draft.documentId, version: state.draft.version },
    base: { documentId: state.document.documentId, version: state.document.version },
    text: state.draft.text,
  };
}
function exported(state: ReturnType<typeof createArtifactDemo>): ArtifactExportIntent {
  return {
    kind: 'export',
    commandId: `artifact-export-${state.sequence}`,
    target: { documentId: state.draft.documentId, version: state.draft.version },
    document: state.draft,
  };
}

describe('artifact demo in-memory host', () => {
  it('saves the exact revision once and rejects replay or mutated intent text', () => {
    const state = createArtifactDemo();
    expect(
      artifactDemoTransition(state, {
        type: 'save',
        intent: { ...save(state), text: 'Different payload' },
      }),
    ).toBe(state);
    const next = artifactDemoTransition(state, { type: 'save', intent: save(state) });
    expect(next.document.text).toBe(state.draft.text);
    expect(next.savedRevision).toBe(2);
    expect(next.saveState.status).toBe('settled');
    expect(artifactDemoTransition(next, { type: 'save', intent: save(state) })).toBe(next);
  });
  it('resolves only the exact original lost save without executing it twice', () => {
    const state = { ...createArtifactDemo(), fault: 'lost-ack' as const };
    const intent = save(state);
    const unknown = artifactDemoTransition(state, { type: 'save', intent });
    expect(unknown.saveState.status).toBe('unknown');
    expect(unknown.savedRevision).toBe(2);
    expect(artifactDemoTransition(unknown, { type: 'save', intent })).toBe(unknown);
    expect(
      artifactDemoTransition(unknown, {
        type: 'lookup',
        command: { ...intent, commandId: 'wrong' },
      }),
    ).toBe(unknown);
    const settled = artifactDemoTransition(unknown, { type: 'lookup', command: intent });
    expect(settled.saveState).toEqual({ status: 'settled', receipt: unknown.originalSave });
    expect(settled.document).toBe(unknown.document);
    expect(settled.savedRevision).toBe(2);
  });
  it('preserves rejection and requires an explicitly issued new command', () => {
    const state = { ...createArtifactDemo(), fault: 'reject' as const };
    const rejected = artifactDemoTransition(state, { type: 'save', intent: save(state) });
    expect(rejected.document).toBe(state.document);
    expect(rejected.draft.text).toBe(state.draft.text);
    expect(artifactDemoTransition(rejected, { type: 'save', intent: save(state) })).toBe(rejected);
    const ready = artifactDemoTransition(rejected, { type: 'retry' });
    expect(ready.sequence).toBe(state.sequence + 1);
    expect(artifactDemoTransition(ready, { type: 'save', intent: save(ready) }).savedRevision).toBe(
      2,
    );
  });
  it('prepares an immutable revision-specific export preview and blocks repeated export', () => {
    const state = createArtifactDemo();
    const next = artifactDemoTransition(state, { type: 'export', intent: exported(state) });
    expect(next.exportPreview?.text).toBe(state.draft.text);
    expect(next.document).toBe(state.document);
    expect(artifactDemoTransition(next, { type: 'export', intent: exported(state) })).toBe(next);
    expect(
      artifactDemoTransition(state, {
        type: 'export',
        intent: { ...exported(state), document: { ...state.draft, text: 'Changed' } },
      }),
    ).toBe(state);
  });
  it('rejects writes and old draft callbacks after base/access changes', () => {
    const state = createArtifactDemo();
    const changed = artifactDemoTransition(state, { type: 'external-change' });
    expect(artifactDemoTransition(changed, { type: 'save', intent: save(state) })).toBe(changed);
    const revoked = artifactDemoTransition(state, { type: 'access' });
    expect(artifactDemoTransition(revoked, { type: 'export', intent: exported(state) })).toBe(
      revoked,
    );
    expect(
      artifactDemoTransition(revoked, {
        type: 'change',
        change: { target: state.draft, text: 'Late edit' },
      }),
    ).toBe(revoked);
    const current = artifactDemoTransition(state, {
      type: 'change',
      change: { target: state.draft, text: 'Current edit' },
    });
    expect(
      artifactDemoTransition(current, {
        type: 'change',
        change: { target: state.draft, text: 'Stale edit' },
      }),
    ).toBe(current);
  });
});

describe('ArtifactPanel and ArtifactEditor compose the actual optional CodeEditor', () => {
  it('acknowledges controlled typing/save and preserves the host draft through panel close/reopen', async () => {
    const { container } = render(<ArtifactDemo />);
    await userEvent.click(screen.getByRole('button', { name: 'Open artifact editor' }));
    const textbox = screen.getByRole('textbox', { name: 'Greeting artifact draft' });
    expect(textbox.closest('.cm-editor')).not.toBeNull();
    const view = EditorView.findFromDOM(textbox)!;
    act(() =>
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: "export const greeting = 'Controlled';\n",
        },
      }),
    );
    expect(view.state.doc.toString()).toBe("export const greeting = 'Controlled';\n");
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(screen.getByText('Saved at revision 2.')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Close artifact' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open artifact editor' }));
    expect(
      EditorView.findFromDOM(
        screen.getByRole('textbox', { name: 'Greeting artifact draft' }),
      )!.state.doc.toString(),
    ).toBe("export const greeting = 'Controlled';\n");
    expect(container.querySelector('textarea')).toBeNull();
  });
  it('hides editor and prepared export text after access revocation and blocks conflict writes', async () => {
    render(<ArtifactDemo />);
    await userEvent.click(screen.getByRole('button', { name: 'Open artifact editor' }));
    await userEvent.click(screen.getByRole('button', { name: 'Export draft' }));
    expect(screen.getByRole('textbox', { name: 'Prepared export text' })).toHaveValue(
      createArtifactDemo().draft.text,
    );
    expect(screen.getByText(/no file was written/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Local host controls' }));
    await userEvent.click(screen.getByRole('button', { name: 'Change saved base' }));
    expect(screen.getByRole('alert')).toHaveTextContent('saved document changed from 1 to 2');
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Greeting artifact draft' })).toHaveAttribute(
      'aria-readonly',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Revoke local access' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Artifact access revoked');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/Hello from Unseen UI/)).not.toBeInTheDocument();
  });
});
