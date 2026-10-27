'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ApprovalCard, ToolCall } from '@stackunseen/ui';
import type { ApprovalProposal, SubmissionState } from '@stackunseen/ui';
import { RunBoard, emptyRunBoardFilter } from '@stackunseen/ui/conversation-flow';
import type { RunBoardFilter, RunCard } from '@stackunseen/ui/conversation-flow';
import '@stackunseen/ui/conversation-flow.css';
import { proposal, tool } from '../lib/fixtures';
import { componentHref } from '../lib/site-paths';

const now = '2026-10-15T10:10:00.000Z';
const runs: RunCard[] = [
  {
    run: { id: 'r1', attemptId: 'a1', threadId: 't1', version: 2, lifecycle: 'running' },
    title: 'Customer sync',
    agent: { id: 'ops', name: 'Ops agent' },
    heartbeatAt: '2026-10-15T10:09:30.000Z',
    updatedAt: '2026-10-15T10:09:30.000Z',
    startedAt: '2026-10-15T10:07:46.000Z',
    cost: { kind: 'estimated', value: { amount: 0.03, currency: 'USD' }, basis: 'token prices' },
  },
  {
    run: { id: 'r2', attemptId: 'a1', threadId: 't2', version: 1, lifecycle: 'waiting-approval' },
    title: 'Weekly report',
    agent: { id: 'docs', name: 'Docs agent' },
    updatedAt: '2026-10-15T10:05:28.000Z',
    waitingOn: { kind: 'approval', id: 'approval-2', label: 'Post to #metrics' },
    cost: { kind: 'estimated', value: { amount: 0.11, currency: 'USD' }, basis: 'token prices' },
  },
  {
    run: { id: 'r3', attemptId: 'a1', threadId: 't3', version: 1, lifecycle: 'succeeded' },
    title: 'Enrich profiles',
    agent: { id: 'ops', name: 'Ops agent' },
    updatedAt: '2026-10-15T09:48:00.000Z',
    cost: { kind: 'measured', value: { amount: 0.04, currency: 'USD' } },
  },
];

/**
 * Homepage: the three components most AI apps need first, each one live with sample props.
 * The approval below never completes on its own: a click shows "sent", and the simulated
 * server answers a moment later, the same way a real host would acknowledge it.
 */
export function HomeShips() {
  const [current, setCurrent] = useState<ApprovalProposal>(proposal);
  const [submission, setSubmission] = useState<SubmissionState>('idle');
  const [filter, setFilter] = useState<RunBoardFilter>(emptyRunBoardFilter);
  const [selected, setSelected] = useState<string | null>(null);
  function decide(decision: 'approve' | 'reject') {
    setSubmission('submitting');
    window.setTimeout(() => {
      setCurrent((prev) => ({ ...prev, status: decision === 'approve' ? 'approved' : 'rejected' }));
      setSubmission('acknowledged');
    }, 700);
  }
  return (
    <section className="home-ships" aria-labelledby="home-ships-title">
      <div className="home-section-heading">
        <div>
          <h2 id="home-ships-title">Start with these three.</h2>
        </div>
        <Link href="/components/">All components</Link>
      </div>
      <ol className="home-ships-rows">
        <li>
          <div className="home-ships-copy">
            <h3>
              <Link prefetch={false} href={componentHref('ToolCall')}>
                ToolCall
              </Link>
            </h3>
            <p>
              Shows each tool the agent used, how long it took and what came back. Open it for the
              input and the result.
            </p>
            <p className="home-ships-notes">
              Copy the input or result, retry on error, live timer.
            </p>
          </div>
          <div className="home-ships-stage">
            <ToolCall value={tool} />
            <ToolCall
              value={{
                ...tool,
                id: 'fetch-handbook',
                name: 'fetch_page',
                label: 'Fetching the handbook',
                target: 'handbook.example.com',
                state: 'running',
                output: undefined,
                durationMs: undefined,
              }}
            />
            <ToolCall
              value={{
                ...tool,
                id: 'kb-fetch',
                name: 'kb.fetch',
                label: 'Fetch the knowledge base',
                target: 'kb.internal',
                state: 'failed',
                output: '403 forbidden',
                durationMs: 310,
              }}
            />
          </div>
        </li>
        <li>
          <div className="home-ships-copy">
            <h3>
              <Link prefetch={false} href={componentHref('ApprovalCard')}>
                ApprovalCard
              </Link>
            </h3>
            <p>
              When the agent wants to do something risky, it stops and asks. People see what it
              wants to do and press Approve or Reject. The card shows done only once your server
              confirms.
            </p>
            <p className="home-ships-notes">
              Binds the action version and scope, counts down expiry, shows stale and unknown
              states.
            </p>
          </div>
          <div className="home-ships-stage">
            <ApprovalCard
              proposal={current}
              submission={submission}
              onDecision={(decision) => decide(decision)}
            />
            {submission !== 'idle' && (
              <button
                type="button"
                className="web-text-link home-ships-reset"
                onClick={() => {
                  setCurrent(proposal);
                  setSubmission('idle');
                }}
              >
                Reset the example
              </button>
            )}
          </div>
        </li>
        <li>
          <div className="home-ships-copy">
            <h3>
              <Link prefetch={false} href={componentHref('RunBoard')}>
                RunBoard
              </Link>
            </h3>
            <p>
              Every job the agent is working on, which ones are done, which ones failed, and what
              each one cost.
            </p>
            <p className="home-ships-notes">
              Board or list, filters with live counts, estimated and measured cost.
            </p>
          </div>
          <div className="home-ships-stage">
            <RunBoard
              runs={runs}
              now={now}
              filter={filter}
              onFilterChange={setFilter}
              selectedId={selected}
              onSelect={setSelected}
              label="Runs"
              hideLabel
            />
          </div>
        </li>
      </ol>
    </section>
  );
}
