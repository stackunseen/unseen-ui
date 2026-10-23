import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MessageEditForm } from './message-edit-form.js';
import { ConversationMessageActions } from './conversation-message-actions.js';
import {
  inspectConversationAction,
  inspectConversationActionState,
  insertPromptText,
} from './contracts.js';
import type {
  ConversationActionState,
  ConversationMessageSnapshot,
  MessageEditCommand,
  MessageRegenerateCommand,
} from './contracts.js';

const target = {
  documentId: 'message-1',
  version: '1',
  workspaceId: 'workspace-1',
  threadId: 'thread-1',
  branchId: 'main',
  branchVersion: '1',
  attemptId: 'attempt-1',
  role: 'user' as const,
};
const current: ConversationMessageSnapshot = { ...target, text: 'Original question' };
const draft = { documentId: 'draft-1', version: '2', text: 'Revised question' };
const command: MessageEditCommand = {
  kind: 'edit',
  commandId: 'edit-1',
  target,
  draft,
  newBranchId: 'branch-2',
};
const assistant = { ...target, documentId: 'response-1', role: 'assistant' as const };
const regenerate: MessageRegenerateCommand = {
  kind: 'regenerate',
  commandId: 'regenerate-1',
  target: assistant,
  newAttemptId: 'attempt-2',
};
function props(state: ConversationActionState = { status: 'idle' }) {
  return {
    target,
    current,
    draft,
    command,
    state,
    onDraftChange: vi.fn(),
    onRequest: vi.fn(),
    onCancel: vi.fn(),
    onReconcile: vi.fn(),
  };
}
describe('controlled conversation edits', () => {
  it('requests one immutable exact edit without claiming branch success', () => {
    const value = props();
    render(<MessageEditForm {...value} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save as new branch' }));
    fireEvent.submit(screen.getByRole('form', { name: 'Edit message' }));
    expect(value.onRequest).toHaveBeenCalledExactlyOnceWith(command);
    expect(Object.isFrozen(value.onRequest.mock.calls[0]![0])).toBe(true);
    expect(screen.queryByText('New conversation branch created.')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue(draft.text);
  });
  it.each(['pending', 'unknown'] as const)(
    'preserves drafts and blocks commands while %s',
    (status) => {
      const value = props({ status, command });
      render(<MessageEditForm {...value} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Wrong' } });
      fireEvent.submit(screen.getByRole('form', { name: 'Edit message' }));
      expect(value.onRequest).not.toHaveBeenCalled();
      expect(value.onDraftChange).not.toHaveBeenCalled();
      if (status === 'unknown') {
        fireEvent.click(screen.getByRole('button', { name: 'Check original request' }));
        expect(value.onReconcile).toHaveBeenCalledExactlyOnceWith(command);
      }
    },
  );
  it('reconciles the original scope after navigation without exposing the old draft', () => {
    const value = props({ status: 'unknown', command });
    render(<MessageEditForm {...value} current={{ ...current, workspaceId: 'other' }} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Check original request' }));
    expect(value.onReconcile).toHaveBeenCalledWith(command);
  });
  it.each([{ version: '2' }, { branchVersion: '2' }, { attemptId: 'other' }])(
    'blocks stale current identity %o and retains draft',
    (change) => {
      const value = props();
      render(<MessageEditForm {...value} current={{ ...current, ...change }} />);
      expect(screen.getByRole('textbox')).toHaveValue(draft.text);
      expect(screen.getByRole('button', { name: 'Save as new branch' })).toBeDisabled();
      fireEvent.submit(screen.getByRole('form', { name: 'Edit message' }));
      expect(value.onRequest).not.toHaveBeenCalled();
    },
  );
  it('keeps empty drafts editable but refuses empty submission and mismatched draft versions', () => {
    const value = props();
    const { rerender } = render(<MessageEditForm {...value} draft={{ ...draft, text: '' }} />);
    expect(screen.getByRole('textbox')).not.toHaveAttribute('readonly');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Next draft' } });
    expect(value.onDraftChange).toHaveBeenCalledWith('Next draft');
    expect(screen.getByRole('button', { name: 'Save as new branch' })).toBeDisabled();
    rerender(<MessageEditForm {...value} draft={{ ...draft, version: 'other' }} />);
    expect(screen.getByRole('button', { name: 'Save as new branch' })).toBeDisabled();
  });
  it('cancels with the controlled draft and returns keyboard focus', async () => {
    const value = props(),
      origin = createRef<HTMLButtonElement>();
    render(
      <>
        <button ref={origin}>Edit original</button>
        <MessageEditForm {...value} returnFocusRef={origin} />
      </>,
    );
    expect(screen.getByRole('textbox')).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(value.onCancel).toHaveBeenCalledWith(target, draft);
    expect(origin.current).toHaveFocus();
  });
  it('preserves the edit while an IME handles Escape', () => {
    const value = props();
    render(<MessageEditForm {...value} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape', isComposing: true });
    expect(value.onCancel).not.toHaveBeenCalled();
  });
  it('shows host rejection and requires a new ID before resubmission', () => {
    const value = props({
      status: 'settled',
      receipt: { command, result: 'rejected', reason: 'Access revoked' },
    });
    render(<MessageEditForm {...value} />);
    expect(screen.getByRole('status')).toHaveTextContent('Access revoked');
    expect(screen.getByRole('button', { name: 'Save as new branch' })).toBeDisabled();
  });
  it('accepts only an acknowledged new branch or distinct response attempt', () => {
    expect(inspectConversationAction({ ...command, newBranchId: target.branchId })).toBeUndefined();
    expect(
      inspectConversationAction({ ...regenerate, newAttemptId: assistant.attemptId }),
    ).toBeUndefined();
    expect(
      inspectConversationActionState({
        status: 'settled',
        receipt: {
          command,
          result: 'applied',
          branchId: 'wrong',
          branchVersion: '1',
          attemptId: 'attempt-2',
        },
      }),
    ).toBeUndefined();
    expect(
      inspectConversationActionState({
        status: 'settled',
        receipt: {
          command: regenerate,
          result: 'applied',
          branchId: 'main',
          branchVersion: '1',
          attemptId: 'attempt-1',
        },
      }),
    ).toBeUndefined();
  });
  it('blocks regeneration replay and binds a new attempt without inventing response text', () => {
    const request = vi.fn();
    render(
      <ConversationMessageActions
        target={assistant}
        current={{ ...assistant, text: 'Original answer' }}
        state={{ status: 'idle' }}
        regenerateCommand={regenerate}
        onRegenerate={request}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));
    expect(request).toHaveBeenCalledExactlyOnceWith(regenerate);
    for (const status of screen.getAllByRole('status'))
      expect(status).not.toHaveTextContent('acknowledged');
  });
  it('rejects invalid state and stale assistant identity', () => {
    const request = vi.fn();
    const { rerender } = render(
      <ConversationMessageActions
        target={assistant}
        current={{ ...assistant, text: 'Answer', version: '2' }}
        state={{ status: 'idle' }}
        regenerateCommand={regenerate}
        onRegenerate={request}
      />,
    );
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeDisabled();
    rerender(
      <ConversationMessageActions
        target={target}
        current={current}
        state={{ status: 'broken' } as unknown as ConversationActionState}
        onEdit={request}
      />,
    );
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
  });
});
describe('revision-bound composer insertion', () => {
  const snapshot = { documentId: 'draft', version: '1', text: 'A🙂B' };
  it('replaces UTF-16 end-exclusive selection without modifying the source', () => {
    expect(insertPromptText(snapshot, { ...snapshot, range: { from: 1, to: 3 } }, '@file')).toEqual(
      { ok: true, text: 'A@fileB', selection: { from: 6, to: 6 } },
    );
    expect(snapshot.text).toBe('A🙂B');
  });
  it('refuses stale revisions, split surrogate ranges and oversized insertion', () => {
    expect(
      insertPromptText(
        snapshot,
        { ...snapshot, digest: 'unconfirmed', range: { from: 0, to: 0 } },
        'x',
      ),
    ).toEqual({ ok: false, reason: 'stale' });
    expect(
      insertPromptText(
        snapshot,
        { documentId: 'draft', version: '2', range: { from: 0, to: 0 } },
        'x',
      ),
    ).toEqual({ ok: false, reason: 'stale' });
    expect(insertPromptText(snapshot, { ...snapshot, range: { from: 2, to: 3 } }, 'x')).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(
      insertPromptText(snapshot, { ...snapshot, range: { from: 0, to: 0 } }, 'x'.repeat(20_000)),
    ).toEqual({ ok: false, reason: 'too-large' });
  });
});
