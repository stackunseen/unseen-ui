'use client';
import { useEffect, useRef, useState } from 'react';
import { ApprovalCard, StatusBadge, ToolCall } from '@stackunseen/ui';
import type { ApprovalProposal, SubmissionState } from '@stackunseen/ui';
import { proposal, tool } from '../lib/fixtures';

/**
 * The hero's live trace: one agent run as the library shows it. Two tool calls have finished,
 * a third is running, and an approval waits for the person. A click only sends the decision;
 * the run moves on when the simulated server answers.
 */
export function HomeTrace() {
  const [current, setCurrent] = useState<ApprovalProposal>(proposal);
  const [submission, setSubmission] = useState<SubmissionState>('idle');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  function decide(decision: 'approve' | 'reject') {
    setSubmission('submitting');
    timer.current = window.setTimeout(() => {
      setCurrent((prev) => ({ ...prev, status: decision === 'approve' ? 'approved' : 'rejected' }));
      setSubmission('acknowledged');
    }, 900);
  }
  const answered = submission === 'acknowledged';
  const state = answered
    ? current.status === 'approved'
      ? 'succeeded'
      : 'cancelled'
    : 'waiting-approval';
  return (
    <figure className="home-trace" aria-label="A live agent run">
      <header className="home-trace-head">
        <h2 className="home-trace-title">
          <span
            className="home-trace-signal"
            data-live={!answered ? '' : undefined}
            aria-hidden="true"
          />
          Account cleanup
        </h2>
        <StatusBadge
          state={state}
          label={
            answered
              ? current.status === 'approved'
                ? 'Server confirmed'
                : 'Stopped by you'
              : submission === 'submitting'
                ? 'Waiting for server'
                : 'Needs you'
          }
        />
      </header>
      <ol className="home-trace-steps">
        <li>
          <ToolCall variant="row" value={tool} />
        </li>
        <li>
          <ToolCall
            variant="row"
            value={{
              ...tool,
              id: 'read-owners',
              name: 'read_owners',
              label: 'Read account owners',
              target: '3 accounts',
              durationMs: 410,
              output: 'Owners found for 3 of 3 accounts',
            }}
          />
        </li>
        <li>
          <ApprovalCard
            proposal={current}
            submission={submission}
            onDecision={(decision) => decide(decision)}
          />
        </li>
      </ol>
      <figcaption className="home-trace-foot">
        {answered ? (
          <button
            type="button"
            className="web-text-link"
            onClick={() => {
              setCurrent(proposal);
              setSubmission('idle');
            }}
          >
            Run it again
          </button>
        ) : (
          <span>Nothing is marked done until the server answers.</span>
        )}
      </figcaption>
    </figure>
  );
}
