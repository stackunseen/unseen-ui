import type { ReviewChangesProps } from './review-changes.js';
import type { ReviewChangesContract } from './review-contract.js';
import s from '../../shared/styles/agent-controls.module.css';

export function ReviewSummary({
  review,
  state,
  error,
  problem,
  originalMatches,
  receiptValid,
  unresolved,
}: {
  review: ReviewChangesContract;
  state: ReviewChangesProps['state'];
  error?: string;
  problem?: string;
  originalMatches: boolean;
  receiptValid: boolean;
  unresolved: boolean;
}) {
  const undone =
    receiptValid &&
    review.submission.status === 'settled' &&
    review.submission.command.action === 'undo' &&
    review.submission.command.files.every(
      (file) =>
        review.submission.status === 'settled' &&
        review.submission.receipt.files.some(
          (outcome) => outcome.id === file.id && outcome.result === 'applied',
        ),
    );
  return (
    <>
      <div className={s.header}>
        <strong>
          {undone
            ? 'Changes undone'
            : review.policy.stage === 'saved'
              ? 'Saved changes'
              : 'Review changes'}
        </strong>
        <span role="status" className={s.tag}>
          {unresolved
            ? 'Outcome unknown'
            : review.submission.status === 'pending'
              ? 'Waiting for confirmation'
              : undone
                ? 'Undo confirmed'
                : review.policy.stage === 'saved'
                  ? 'Saved'
                  : state}
        </span>
      </div>
      {problem && (
        <p role="alert" className={s.warning}>
          {problem}
        </p>
      )}
      {!originalMatches && (
        <p role="alert" className={s.error}>
          This request doesn’t match the changes you reviewed. Refresh to get the latest.
        </p>
      )}
      {!receiptValid && (
        <p role="alert" className={s.error}>
          The confirmation doesn’t match the original request, so the results aren’t verified.
        </p>
      )}
      {review.access !== 'allowed' && (
        <p role="status" className={s.warning}>
          Review access is {review.access}. Ask the host to restore access.
        </p>
      )}
      {state === 'stale' && (
        <p role="status" className={s.warning}>
          The base version changed. Refresh this proposal.
        </p>
      )}
      {error && (
        <p role="alert" className={s.error}>
          {error.slice(0, 1000)}
        </p>
      )}
    </>
  );
}
