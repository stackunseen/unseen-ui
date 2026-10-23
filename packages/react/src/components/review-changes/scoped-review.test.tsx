import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReviewChanges } from '@stackunseen/ui';
import type { ProposedChange, ReviewChangesProps } from './review-changes.js';
import type { ReviewChangesContract, ReviewCommand, ReviewReceipt } from './review-contract.js';
import { selectedReviewFiles } from './review-model.js';

const target = { documentId: 'source', version: 'file-1', digest: 'host-source-digest' };
const file: ProposedChange = {
  id: 'source',
  path: 'src/query.ts',
  before: 'alpha\nbeta\n',
  after: 'ALPHA\nBETA\n',
  target,
  operation: { kind: 'modify' },
  hunks: [
    {
      id: 'first',
      label: 'Normalize first line',
      target: { ...target, range: { from: 0, to: 5 } },
      insert: 'ALPHA',
    },
    {
      id: 'second',
      label: 'Normalize second line',
      target: { ...target, range: { from: 6, to: 10 } },
      insert: 'BETA',
    },
  ],
};
function setup(
  overrides: Partial<ReviewChangesProps> = {},
  contract: Partial<ReviewChangesContract> = {},
) {
  const changes = overrides.changes ?? [file];
  const selectedIds = overrides.selectedIds ?? changes.map((item) => item.id);
  const props: ReviewChangesProps = {
    changes,
    selectedIds,
    baseVersion: 'project-1',
    proposalVersion: 'proposal-1',
    variant: 'stack',
    state: 'ready',
    onSelectionChange: vi.fn(),
    onDecision: vi.fn(),
    ...overrides,
  };
  const scope = selectedReviewFiles(changes, selectedIds, contract.selectedHunks ?? []);
  const command: ReviewCommand = {
    commandId: 'apply-1',
    target: { documentId: 'proposal', version: 'proposal-1' },
    baseVersion: props.baseVersion,
    proposalVersion: props.proposalVersion,
    action: 'apply',
    files: scope,
  };
  props.review = {
    proposal: command.target,
    currentTargets: changes.flatMap((item) => (item.target ? [item.target] : [])),
    policy: { stage: 'pending' },
    access: 'allowed',
    submission: { status: 'idle' },
    selectedHunks: [],
    onHunkSelectionChange: vi.fn(),
    onCommand: vi.fn(),
    commands: {
      apply: command,
      discard: { ...command, commandId: 'discard-1', action: 'discard' },
    },
    lookup: { requestId: 'lookup-1', status: 'ready', onRequest: vi.fn() },
    ...contract,
  };
  return { props, review: props.review, command };
}
const applyButton = () => screen.getByRole('button', { name: 'Apply selected changes' });

describe('precise host-owned change review', () => {
  it('submits the exact prepared command once without inventing saved state', () => {
    const { props, review, command } = setup();
    const view = render(<ReviewChanges {...props} />);
    fireEvent.click(applyButton());
    fireEvent.click(applyButton());
    fireEvent.click(screen.getByRole('button', { name: 'Discard selected changes' }));
    view.rerender(<ReviewChanges {...props} />);
    fireEvent.click(applyButton());
    expect(review.onCommand).toHaveBeenCalledExactlyOnceWith(command);
    expect(review.onCommand).toHaveBeenCalledWith(
      expect.objectContaining({ files: [{ id: 'source', target }] }),
    );
    expect(props.onDecision).not.toHaveBeenCalled();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('binds a discard decision to the same selected hunk scope', () => {
    const { props, review } = setup(
      {},
      { selectedHunks: [{ changeId: 'source', hunkIds: ['second'] }] },
    );
    render(<ReviewChanges {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Discard selected changes' }));
    expect(review.onCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'discard',
        files: [{ id: 'source', target, hunkIds: ['second'] }],
      }),
    );
  });

  it('emits controlled hunk selection, then waits for a newly matching host command', async () => {
    const { props, review } = setup();
    const view = render(<ReviewChanges {...props} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Normalize first line/ }));
    expect(review.onHunkSelectionChange).toHaveBeenCalledWith([
      { changeId: 'source', hunkIds: ['second'] },
    ]);
    view.rerender(
      <ReviewChanges
        {...props}
        review={{ ...review, selectedHunks: [{ changeId: 'source', hunkIds: ['second'] }] }}
      />,
    );
    expect(applyButton()).toBeDisabled();
    const updated = setup({}, { selectedHunks: [{ changeId: 'source', hunkIds: ['second'] }] });
    view.rerender(<ReviewChanges {...updated.props} />);
    expect(applyButton()).toBeEnabled();
  });

  it.each(['stale', 'pending', 'rejected'] as const)('locks explicit %s lifecycle', (state) => {
    render(<ReviewChanges {...setup({ state }).props} />);
    expect(applyButton()).toBeDisabled();
  });

  it.each(['denied', 'revoked'] as const)('locks %s access with an explanation', (access) => {
    render(<ReviewChanges {...setup({}, { access }).props} />);
    expect(applyButton()).toBeDisabled();
    expect(screen.getByText(new RegExp(`Review access is ${access}`))).toBeVisible();
  });

  it('locks stale or ambiguous current document revisions', () => {
    const { props, review } = setup();
    const view = render(
      <ReviewChanges
        {...props}
        review={{ ...review, currentTargets: [{ ...target, version: 'file-2' }] }}
      />,
    );
    expect(applyButton()).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('base version changed');
    view.rerender(
      <ReviewChanges {...props} review={{ ...review, currentTargets: [target, target] }} />,
    );
    expect(applyButton()).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('ambiguous');
  });

  it.each([
    { selectedIds: ['source', 'source'] },
    { selectedIds: ['missing'] },
    { changes: [file, file] },
    { changes: [{ ...file, id: '' }] },
    { changes: [file, { ...file, id: 'other' }] },
  ])('rejects ambiguous file selections and targets %#', (overrides) => {
    render(<ReviewChanges {...setup(overrides).props} />);
    expect(applyButton()).toBeDisabled();
  });

  it.each(
    [
      [
        { ...file.hunks![0]!, target: { ...target, version: 'older', range: { from: 0, to: 5 } } },
        file.hunks![1]!,
      ],
      [file.hunks![0]!, { ...file.hunks![1]!, id: 'first' }],
      [file.hunks![0]!, { ...file.hunks![1]!, target: { ...target, range: { from: 4, to: 10 } } }],
      [{ ...file.hunks![0]!, target: { ...target, range: { from: -1, to: 5 } } }, file.hunks![1]!],
      [{ ...file.hunks![0]!, insert: 'unreviewed text' }, file.hunks![1]!],
    ].map((hunks) => ({ hunks })),
  )('rejects stale, duplicate, overlapping, invalid or misleading hunks %#', ({ hunks }) => {
    render(<ReviewChanges {...setup({ changes: [{ ...file, hunks }] }).props} />);
    expect(applyButton()).toBeDisabled();
  });

  it('rejects hunk boundaries that split a UTF-16 surrogate pair', () => {
    const emoji = {
      ...file,
      before: '\u{1f600}',
      after: 'replacement',
      hunks: [
        { id: 'emoji', target: { ...target, range: { from: 1, to: 2 } }, insert: 'replacement' },
      ],
    };
    render(<ReviewChanges {...setup({ changes: [emoji] }).props} />);
    expect(applyButton()).toBeDisabled();
  });

  it.each(
    [
      [{ changeId: 'source', hunkIds: ['missing'] }],
      [{ changeId: 'source', hunkIds: ['first', 'first'] }],
      [
        { changeId: 'source', hunkIds: ['first'] },
        { changeId: 'source', hunkIds: ['second'] },
      ],
      [{ changeId: 'missing', hunkIds: ['first'] }],
    ].map((selectedHunks) => ({ selectedHunks })),
  )('rejects ambiguous hunk selections %#', ({ selectedHunks }) => {
    render(<ReviewChanges {...setup({}, { selectedHunks }).props} />);
    expect(applyButton()).toBeDisabled();
  });

  it('requires at least one selected hunk and bounds the review', () => {
    const { props, review } = setup({}, { selectedHunks: [{ changeId: 'source', hunkIds: [] }] });
    const view = render(<ReviewChanges {...props} />);
    expect(applyButton()).toBeDisabled();
    const tooMany = Array.from({ length: 51 }, (_, index) => ({
      ...file,
      id: String(index),
      path: `${index}.ts`,
      target: { ...target, documentId: String(index) },
    }));
    view.rerender(<ReviewChanges {...props} changes={tooMany} review={review} />);
    expect(applyButton()).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('50-change');
  });

  it('renders typed add/delete/rename metadata and absence revisions', () => {
    const changes: ProposedChange[] = [
      {
        id: 'new',
        path: 'new.ts',
        before: '',
        after: 'new',
        operation: { kind: 'add' },
        target: { documentId: 'new', version: 'absent-1' },
      },
      {
        id: 'old',
        path: 'old.ts',
        before: 'old',
        after: '',
        operation: { kind: 'delete' },
        target: { documentId: 'old', version: 'old-1' },
      },
      {
        id: 'rename',
        path: 'renamed.ts',
        before: 'same',
        after: 'same',
        operation: { kind: 'rename', fromPath: 'source.ts' },
        target: { documentId: 'rename', version: 'name-1' },
      },
    ];
    const { props } = setup({ changes });
    render(<ReviewChanges {...props} />);
    expect(applyButton()).toBeEnabled();
    expect(screen.getByText('Add file')).toBeVisible();
    expect(screen.getByText('Delete file')).toBeVisible();
    expect(screen.getByText('Rename file from source.ts')).toBeVisible();
  });

  it.each([
    { kind: 'add' },
    { kind: 'delete' },
    { kind: 'rename', fromPath: 'src/query.ts' },
  ] as const)('blocks operation metadata inconsistent with the comparison: $kind', (operation) => {
    render(
      <ReviewChanges {...setup({ changes: [{ ...file, hunks: undefined, operation }] }).props} />,
    );
    expect(applyButton()).toBeDisabled();
  });

  it('never repeats pending or unknown actions and looks up the exact original command once', () => {
    const { props, review, command } = setup();
    const view = render(
      <ReviewChanges
        {...props}
        review={{ ...review, submission: { status: 'pending', command } }}
      />,
    );
    expect(applyButton()).toBeDisabled();
    expect(screen.getAllByText(/Waiting for confirmation/)[0]).toBeVisible();
    view.rerender(
      <ReviewChanges
        {...props}
        review={{ ...review, submission: { status: 'unknown', command } }}
      />,
    );
    expect(applyButton()).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Check original command' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check original command' }));
    expect(review.lookup!.onRequest).toHaveBeenCalledExactlyOnceWith(command);
    expect(review.onCommand).not.toHaveBeenCalled();
    view.rerender(
      <ReviewChanges
        {...props}
        review={{
          ...review,
          submission: { status: 'unknown', command },
          lookup: { ...review.lookup!, requestId: 'lookup-retry' },
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Check original command' }));
    expect(review.lookup!.onRequest).toHaveBeenCalledTimes(2);
  });

  it('preserves acknowledged per-file outcomes while missing outcomes remain unknown', () => {
    const other = {
      ...file,
      id: 'other',
      path: 'other.ts',
      hunks: undefined,
      target: { documentId: 'other', version: 'file-1' },
    };
    const { props, review, command } = setup({ changes: [file, other] });
    const receipt: ReviewReceipt = {
      command,
      files: [{ ...command.files[0]!, result: 'applied', nextVersion: 'file-2' }],
    };
    const view = render(
      <ReviewChanges
        {...props}
        review={{ ...review, submission: { status: 'settled', command, receipt } }}
      />,
    );
    expect(screen.getByText(/src\/query.ts: Applied/)).toBeVisible();
    expect(screen.getByText(/other.ts: Outcome unknown/)).toBeVisible();
    expect(applyButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Check original command' })).toBeEnabled();
    view.rerender(
      <ReviewChanges
        {...props}
        review={{
          ...review,
          submission: {
            status: 'settled',
            command,
            receipt: {
              command,
              files: [
                ...receipt.files,
                { ...command.files[1]!, result: 'rejected', reason: 'Write access changed' },
              ],
            },
          },
        }}
      />,
    );
    expect(screen.getByText(/other.ts: Rejected · Write access changed/)).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Check original command' }),
    ).not.toBeInTheDocument();
    expect(applyButton()).toBeDisabled();
  });

  it.each(['command-id', 'action', 'target', 'file-target', 'duplicate'] as const)(
    'suppresses unverified receipt outcomes: %s',
    (fault) => {
      const { props, review, command } = setup();
      let receipt: ReviewReceipt = {
        command,
        files: [{ ...command.files[0]!, result: 'applied', nextVersion: 'file-2' }],
      };
      if (fault === 'command-id')
        receipt = { ...receipt, command: { ...command, commandId: 'other' } };
      if (fault === 'action') receipt = { ...receipt, command: { ...command, action: 'discard' } };
      if (fault === 'target')
        receipt = {
          ...receipt,
          command: { ...command, target: { ...command.target, version: 'other' } },
        };
      if (fault === 'file-target')
        receipt = {
          ...receipt,
          files: [{ ...receipt.files[0]!, target: { ...target, version: 'other' } }],
        };
      if (fault === 'duplicate')
        receipt = { ...receipt, files: [receipt.files[0]!, receipt.files[0]!] };
      render(
        <ReviewChanges
          {...props}
          review={{ ...review, submission: { status: 'settled', command, receipt } }}
        />,
      );
      expect(screen.getByText(/results aren’t verified/)).toBeVisible();
      expect(screen.queryByText(/src\/query.ts: Applied/)).not.toBeInTheDocument();
      expect(applyButton()).toBeDisabled();
    },
  );

  it('rejects a scoped original command referencing a different file target', () => {
    const { props, review, command } = setup();
    render(
      <ReviewChanges
        {...props}
        review={{
          ...review,
          submission: {
            status: 'unknown',
            command: {
              ...command,
              files: [
                { ...command.files[0]!, target: { ...target, documentId: 'another-document' } },
              ],
            },
          },
        }}
      />,
    );
    expect(applyButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Check original command' })).toBeDisabled();
  });

  it('uses persisted command history to prevent replay after remount', () => {
    render(<ReviewChanges {...setup({}, { completedCommandIds: ['apply-1'] }).props} />);
    expect(applyButton()).toBeDisabled();
  });

  it('does not show unselected hunks as saved effects', () => {
    const { props, review, command } = setup(
      {},
      { selectedHunks: [{ changeId: 'source', hunkIds: ['first'] }] },
    );
    render(
      <ReviewChanges
        {...props}
        review={{
          ...review,
          currentTargets: [{ ...target, version: 'file-2' }],
          policy: {
            stage: 'saved',
            commandId: command.commandId,
            targets: [{ ...target, version: 'file-2' }],
            undo: 'unavailable',
          },
          submission: {
            status: 'settled',
            command,
            receipt: {
              command,
              files: [{ ...command.files[0]!, result: 'applied', nextVersion: 'file-2' }],
            },
          },
        }}
      />,
    );
    const diff = within(screen.getByRole('group', { name: 'Changes in src/query.ts' }));
    expect(diff.getByText('ALPHA')).toBeVisible();
    expect(diff.queryByText('BETA')).not.toBeInTheDocument();
  });

  it('keeps per-file outcomes visible in closed accordion headers', () => {
    const { props, review, command } = setup({ variant: 'accordion' });
    render(
      <ReviewChanges
        {...props}
        review={{
          ...review,
          submission: {
            status: 'settled',
            command,
            receipt: {
              command,
              files: [{ ...command.files[0]!, result: 'rejected', reason: 'Access changed' }],
            },
          },
        }}
      />,
    );
    expect(
      screen.getByRole('button', { name: /src\/query.ts · Rejected · Access changed/ }),
    ).toBeVisible();
  });

  it('guards scoped conflicts and command ID collisions', () => {
    const { props, review, command } = setup({ changes: [{ ...file, conflict: true }] });
    const view = render(<ReviewChanges {...props} />);
    expect(applyButton()).toBeDisabled();
    expect(screen.getByText(/Conflict: refresh/)).toBeVisible();
    view.rerender(
      <ReviewChanges
        {...props}
        changes={[file]}
        review={{
          ...review,
          commands: { apply: command, discard: { ...command, action: 'discard' } },
        }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('change history doesn’t add up');
    expect(applyButton()).toBeDisabled();
  });

  it('allows an absent optional command without crashing or guessing an action', () => {
    const { props, review } = setup();
    render(<ReviewChanges {...props} review={{ ...review, commands: { apply: undefined } }} />);
    expect(applyButton()).toBeDisabled();
  });

  it('permits only host-offered undo against exact saved revisions and original command', () => {
    const { props, review, command } = setup({ state: 'accepted' });
    const saved = { documentId: 'source', version: 'file-2' };
    const undo: ReviewCommand = {
      ...command,
      commandId: 'undo-1',
      action: 'undo',
      undoOf: 'apply-1',
      files: [{ id: 'source', target: saved }],
    };
    const savedReview: ReviewChangesContract = {
      ...review,
      currentTargets: [saved],
      policy: { stage: 'saved', commandId: 'apply-1', targets: [saved], undo: 'available' },
      commands: { undo },
    };
    const view = render(<ReviewChanges {...props} review={savedReview} />);
    expect(
      screen.queryByRole('button', { name: 'Apply selected changes' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo selected saved changes' }));
    expect(review.onCommand).toHaveBeenCalledExactlyOnceWith(undo);
    view.rerender(
      <ReviewChanges
        {...props}
        review={{ ...savedReview, commands: { undo: { ...undo, undoOf: 'wrong-command' } } }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Undo selected saved changes' })).toBeDisabled();
    view.rerender(
      <ReviewChanges
        {...props}
        review={{ ...savedReview, currentTargets: [{ ...saved, version: 'file-3' }] }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Undo selected saved changes' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('saved revision changed');
    view.rerender(
      <ReviewChanges
        {...props}
        review={{
          ...savedReview,
          policy: {
            ...savedReview.policy,
            stage: 'saved',
            commandId: 'apply-1',
            targets: [saved],
            undo: 'unavailable',
            reason: 'Saved changes require a new proposal.',
          },
        }}
      />,
    );
    expect(screen.getByText('Saved changes require a new proposal.')).toBeVisible();
  });

  it('does not expose undo for files absent from the host saved scope', () => {
    const { props, review, command } = setup();
    render(
      <ReviewChanges
        {...props}
        review={{
          ...review,
          policy: { stage: 'saved', commandId: 'apply-1', targets: [], undo: 'available' },
          commands: {
            undo: { ...command, commandId: 'undo-1', action: 'undo', undoOf: 'apply-1' },
          },
        }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Undo selected saved changes' })).toBeDisabled();
  });
});

describe('legacy review compatibility', () => {
  it('retains existing decision shape and guards repeated acceptance', () => {
    const props = { ...setup().props, review: undefined };
    render(<ReviewChanges {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Accept selected changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject proposal' }));
    expect(props.onDecision).toHaveBeenCalledExactlyOnceWith({
      baseVersion: 'project-1',
      proposalVersion: 'proposal-1',
      ids: ['source'],
      decision: 'accept',
    });
  });
});
