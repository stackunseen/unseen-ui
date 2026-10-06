'use client';
import { CodeDiff } from '../code-diff/code-diff.js';
import { applyTextEdits } from '@stackunseen/ui-core/editing';
import type { ReviewChangesProps, ProposedChange } from './review-changes.js';
import type { ReviewChangesContract } from './review-contract.js';
import s from '../../shared/styles/agent-controls.module.css';

export function reviewFileStatus(id: string, review: ReviewChangesContract): string | undefined {
  const submission = review.submission;
  if (submission.status === 'idle' || !submission.command.files.some((file) => file.id === id))
    return;
  const outcome =
    submission.status === 'settled'
      ? submission.receipt.files.find((file) => file.id === id)
      : undefined;
  return submission.status === 'pending'
    ? 'Awaiting host acknowledgement'
    : outcome?.result === 'applied'
      ? `${submission.command.action === 'discard' ? 'Discarded' : submission.command.action === 'undo' ? 'Undone' : 'Applied'} · revision ${outcome.nextVersion}`
      : outcome?.result === 'rejected'
        ? `Rejected · ${outcome.reason.slice(0, 1000)}`
        : 'Outcome unknown';
}

export function ReviewFile({
  file,
  props,
  review,
  locked,
  valid,
}: {
  file: ProposedChange;
  props: ReviewChangesProps;
  review: ReviewChangesContract;
  locked: boolean;
  valid: boolean;
}) {
  const selected = props.selectedIds.includes(file.id);
  const selection = review.selectedHunks.find((item) => item.changeId === file.id);
  const operation = file.operation?.kind ?? 'modify';
  const labels = {
    add: 'Add file',
    modify: 'Modify file',
    delete: 'Delete file',
    rename: 'Rename file',
  };
  const submission = review.submission;
  const outcome =
    submission.status === 'settled'
      ? submission.receipt.files.find((item) => item.id === file.id)
      : undefined;
  const requested =
    submission.status !== 'idle' && submission.command.files.some((item) => item.id === file.id);
  let after = file.after;
  if (
    valid &&
    review.policy.stage === 'saved' &&
    outcome?.result === 'applied' &&
    submission.status === 'settled'
  ) {
    if (submission.command.action === 'undo') after = file.before;
    else if (outcome.hunkIds && file.target && file.hunks) {
      const result = applyTextEdits(
        { ...file.target, text: file.before },
        file.target,
        file.hunks
          .filter((hunk) => outcome.hunkIds!.includes(hunk.id))
          .map((hunk) => ({ range: hunk.target.range, insert: hunk.insert })),
      );
      if (result.ok) after = result.text;
    }
  }
  return (
    <div className={s.root} data-part="review-file" data-operation={operation}>
      <label className={s.choice}>
        <input
          type="checkbox"
          checked={selected}
          disabled={locked || file.conflict}
          onChange={(event) =>
            props.onSelectionChange(
              event.target.checked
                ? [...props.selectedIds.filter((id) => id !== file.id), file.id]
                : props.selectedIds.filter((id) => id !== file.id),
            )
          }
        />
        <span>
          <strong>Include {file.path.slice(0, 1000)}</strong>
          <small>
            {labels[operation]}
            {file.operation?.kind === 'rename'
              ? ` from ${file.operation.fromPath.slice(0, 1000)}`
              : ''}
          </small>
        </span>
      </label>
      {file.conflict && (
        <p role="status" className={s.warning}>
          Conflict: refresh {file.path.slice(0, 1000)} before applying.
        </p>
      )}
      {valid && review.policy.stage === 'pending' && file.hunks?.length && (
        <fieldset className={s.fieldset}>
          <legend>Hunks in {file.path.slice(0, 1000)}</legend>
          <div className={s.options}>
            {file.hunks.slice(0, 50).map((hunk, index) => (
              <div className={s.root} key={`${hunk.id}:${index}`}>
                <label className={s.choice}>
                  <input
                    type="checkbox"
                    checked={selected && (!selection || selection.hunkIds.includes(hunk.id))}
                    disabled={locked || !selected || file.conflict}
                    onChange={(event) => {
                      const ids = selection?.hunkIds ?? file.hunks!.map((item) => item.id);
                      review.onHunkSelectionChange([
                        ...review.selectedHunks.filter((item) => item.changeId !== file.id),
                        {
                          changeId: file.id,
                          hunkIds: event.target.checked
                            ? [...ids.filter((id) => id !== hunk.id), hunk.id]
                            : ids.filter((id) => id !== hunk.id),
                        },
                      ]);
                    }}
                  />
                  <span>
                    <strong>{hunk.label?.slice(0, 256) || `Hunk ${index + 1}`}</strong>
                    <small>
                      UTF-16 range {hunk.target?.range?.from ?? '?'}-{hunk.target?.range?.to ?? '?'}{' '}
                      at {hunk.target?.version.slice(0, 256)}
                    </small>
                  </span>
                </label>
                {hunk.target?.range && (
                  <CodeDiff
                    path={`${file.path.slice(0, 1000)} · Hunk ${index + 1}`}
                    before={file.before.slice(hunk.target.range.from, hunk.target.range.to)}
                    after={hunk.insert}
                    baseVersion={hunk.target.version}
                    nextVersion={props.proposalVersion}
                    sourceIdentities={{ before: hunk.target, after: review.proposal }}
                    copyable={false}
                    variant={props.variant === 'compact' ? 'compact' : 'unified'}
                  />
                )}
              </div>
            ))}
          </div>
        </fieldset>
      )}
      {valid && (!file.hunks?.length || review.policy.stage === 'saved') && (
        <CodeDiff
          path={file.path}
          before={file.before}
          after={after}
          baseVersion={file.target?.version ?? props.baseVersion}
          nextVersion={
            review.policy.stage === 'saved' && outcome?.result === 'applied'
              ? outcome.nextVersion
              : props.proposalVersion
          }
          sourceIdentities={
            file.target
              ? {
                  before: file.target,
                  after:
                    review.policy.stage === 'saved' && outcome?.result === 'applied'
                      ? { documentId: file.target.documentId, version: outcome.nextVersion }
                      : review.proposal,
                }
              : undefined
          }
          status={file.conflict ? 'conflict' : 'ready'}
          variant={props.variant === 'compact' ? 'compact' : 'unified'}
        />
      )}
      {requested && (
        <p
          role="status"
          data-part="review-file-outcome"
          className={outcome?.result === 'rejected' ? s.error : s.muted}
        >
          {file.path.slice(0, 1000)}: {reviewFileStatus(file.id, review)}
        </p>
      )}
    </div>
  );
}
