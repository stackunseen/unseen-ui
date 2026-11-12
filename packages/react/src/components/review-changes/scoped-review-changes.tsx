'use client';
import { useEffect, useRef } from 'react';
import type { ComponentProps } from 'react';
import { useMergedRef } from '../../shared/use-merged-ref.js';
import { Accordion } from '../accordion/accordion.js';
import { Button } from '../button/button.js';
import { ReviewFile } from './review-file.js';
import { reviewFileStatus } from './review-file.js';
import { ReviewSummary } from './review-summary.js';
import {
  reviewCommandReady,
  reviewProblem,
  reviewReceiptValid,
  reviewOriginalMatches,
  selectedReviewFiles,
} from './review-model.js';
import type { ReviewChangesProps } from './review-changes.js';
import type { ReviewChangesContract, ReviewCommand } from './review-contract.js';
import s from '../../shared/styles/agent-controls.module.css';
import a from '../../shared/styles/action-layout.module.css';

const ownProps = new Set([
  'review',
  'changes',
  'baseVersion',
  'proposalVersion',
  'selectedIds',
  'onSelectionChange',
  'state',
  'error',
  'onDecision',
  'variant',
  'className',
  'ref',
]);

export function ScopedReviewChanges(props: ReviewChangesProps & { review: ReviewChangesContract }) {
  const {
    review,
    changes,
    baseVersion,
    proposalVersion,
    selectedIds,
    state,
    error,
    variant = 'accordion',
  } = props;
  const submitted = useRef(new Set<string>());
  const awaitingProposal = useRef<string | undefined>(undefined);
  const lookups = useRef(new Set<string>());
  const root = useRef<HTMLDivElement>(null);
  const rootRef = useMergedRef(root, props.ref);
  const rest = Object.fromEntries(
    Object.entries(props).filter(([name]) => !ownProps.has(name)),
  ) as ComponentProps<'div'>;
  const previousStatus = useRef(review.submission.status);
  useEffect(() => {
    if (
      previousStatus.current !== review.submission.status &&
      document.activeElement === document.body
    )
      root.current?.focus();
    previousStatus.current = review.submission.status;
  }, [review.submission.status]);
  const problem = reviewProblem(changes, baseVersion, proposalVersion, selectedIds, review);
  const preview = changes.slice(0, 50);
  const submission = review.submission;
  const original = submission.status !== 'idle' ? submission.command : undefined;
  const originalMatches =
    !original || reviewOriginalMatches(original, preview, baseVersion, proposalVersion, review);
  const receiptValid =
    submission.status !== 'settled' ||
    (originalMatches && reviewReceiptValid(submission.command, submission.receipt));
  const unresolved =
    submission.status === 'unknown' ||
    (submission.status === 'settled' &&
      (!receiptValid ||
        submission.command.files.some(
          (file) =>
            !submission.receipt.files.some(
              (outcome) => outcome.id === file.id && outcome.result !== 'unknown',
            ),
        )));
  const locked =
    !!problem ||
    !originalMatches ||
    !receiptValid ||
    review.access !== 'allowed' ||
    !(
      review.policy.stage === 'saved' ? ['ready', 'accepted', 'error'] : ['ready', 'error']
    ).includes(state) ||
    submission.status === 'pending' ||
    unresolved;
  const files = selectedReviewFiles(
    preview,
    selectedIds.slice(0, 50),
    review.selectedHunks.slice(0, 50),
  );
  const conflict = preview.some((file) => selectedIds.includes(file.id) && file.conflict);
  function available(action: ReviewCommand['action']) {
    return (
      !locked &&
      !conflict &&
      reviewCommandReady(
        review.commands[action],
        action,
        files,
        baseVersion,
        proposalVersion,
        review,
      )
    );
  }
  function command(action: ReviewCommand['action']) {
    const request = review.commands[action];
    const proposalKey = JSON.stringify([review.proposal.documentId, review.proposal.version]);
    if (
      !available(action) ||
      !request ||
      (submission.status === 'idle' && awaitingProposal.current === proposalKey) ||
      submitted.current.has(request.commandId) ||
      submitted.current.size >= 100
    )
      return;
    submitted.current.add(request.commandId);
    awaitingProposal.current = proposalKey;
    review.onCommand(request);
  }
  const lookupReady =
    unresolved &&
    originalMatches &&
    review.lookup?.status === 'ready' &&
    !!review.lookup.requestId.trim() &&
    review.access === 'allowed';
  const visibleReview =
    receiptValid && originalMatches
      ? review
      : { ...review, submission: { status: 'idle' as const } };
  return (
    <div
      {...rest}
      ref={rootRef}
      tabIndex={-1}
      aria-busy={submission.status === 'pending' || review.lookup?.status === 'pending'}
      className={`${s.root} ${props.className ?? ''}`}
      data-part="review-changes"
      data-variant={variant}
      data-stage={review.policy.stage}
    >
      <ReviewSummary
        review={visibleReview}
        state={state}
        error={error}
        problem={problem}
        originalMatches={originalMatches}
        receiptValid={receiptValid}
        unresolved={unresolved}
      />
      {!changes.length ? (
        <p className={s.muted}>No changes to review.</p>
      ) : variant === 'accordion' ? (
        <Accordion
          type="multiple"
          items={preview.map((file, index) => ({
            value: `${file.id}:${index}`,
            title: `${file.path.slice(0, 1000)}${file.conflict ? ' · Conflict' : ''}${reviewFileStatus(file.id, visibleReview) ? ` · ${reviewFileStatus(file.id, visibleReview)}` : ''}`,
            content: (
              <ReviewFile
                file={file}
                props={props}
                review={visibleReview}
                locked={locked}
                valid={!problem}
              />
            ),
          }))}
        />
      ) : (
        <div className={s.options}>
          {preview.map((file, index) => (
            <ReviewFile
              key={`${file.id}:${index}`}
              file={file}
              props={props}
              review={visibleReview}
              locked={locked}
              valid={!problem}
            />
          ))}
        </div>
      )}
      {unresolved && (
        <div className={s.root}>
          <p role="status" className={s.warning}>
            Check the original command {original?.commandId.slice(0, 256)}. Do not apply it again
            while the outcome is unknown.
          </p>
          <div className={a.footer}>
            <Button
              variant="outline"
              disabled={!lookupReady}
              onClick={() => {
                if (
                  !lookupReady ||
                  !review.lookup ||
                  !original ||
                  lookups.current.has(review.lookup.requestId) ||
                  lookups.current.size >= 100
                )
                  return;
                lookups.current.add(review.lookup.requestId);
                review.lookup.onRequest(original);
              }}
            >
              {review.lookup?.status === 'pending'
                ? 'Checking original command'
                : 'Check original command'}
            </Button>
          </div>
        </div>
      )}
      {review.policy.stage === 'saved' && review.policy.undo === 'unavailable' && (
        <p role="status" className={s.muted}>
          {review.policy.reason?.slice(0, 1000) || 'These saved changes can’t be undone here.'}
        </p>
      )}
      <div className={a.footer} role="group" aria-label="Change review decision">
        {review.policy.stage === 'pending' ? (
          <>
            <Button
              variant="outline"
              disabled={!available('discard')}
              onClick={() => command('discard')}
            >
              Discard selected changes
            </Button>
            <Button disabled={!available('apply')} onClick={() => command('apply')}>
              Apply selected changes
            </Button>
          </>
        ) : (
          <Button variant="outline" disabled={!available('undo')} onClick={() => command('undo')}>
            Undo selected saved changes
          </Button>
        )}
      </div>
    </div>
  );
}
