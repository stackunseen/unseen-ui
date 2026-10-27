'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import {
  ChevronDownIcon,
  PlusIcon,
  RadiobuttonIcon,
  ResetIcon,
  ViewVerticalIcon,
} from '@radix-ui/react-icons';
import { Button, RuntimeProvider, StatusBadge, Tabs, useRuntimeSelector } from '@stackunseen/ui';
import { SplitPane } from '@stackunseen/ui/layout';
import type { ApprovalProposal, SubmissionState } from '@stackunseen/ui-core';
import { createMockHost } from '../lib/mock-host';
import type { MockHost } from '../lib/mock-host';
import {
  WorkbenchAccounts,
  WorkbenchActivity,
  WorkbenchConversation,
  WorkbenchInspector,
} from './workbench-panels';
import s from './workbench.module.css';

export interface WorkbenchReview {
  id: number;
  title: string;
  draft: string;
  host: MockHost;
  submission: SubmissionState;
  commandId: string;
  error: string;
  loseAcknowledgement: boolean;
}

function createReview(id: number): WorkbenchReview {
  return {
    id,
    title: id === 1 ? 'Account review' : `New review ${id}`,
    draft: 'Find inactive accounts and prepare them for review.',
    host: createMockHost(),
    submission: 'idle',
    commandId: '',
    error: '',
    loseAcknowledgement: false,
  };
}

function ReviewLink({
  review,
  selected,
  onSelect,
}: {
  review: WorkbenchReview;
  selected: boolean;
  onSelect: () => void;
}) {
  const snapshot = useSyncExternalStore(
    review.host.runtime.subscribe,
    review.host.runtime.getSnapshot,
    review.host.runtime.getServerSnapshot,
  );
  return (
    <a
      className={s.reviewLink}
      href={`#review-${review.id}`}
      aria-current={selected ? 'page' : undefined}
      onClick={(event) => {
        event.preventDefault();
        onSelect();
      }}
    >
      <span>{review.title}</span>
      <small>
        {review.submission === 'outcome-unknown'
          ? 'Decision unconfirmed'
          : snapshot.run.lifecycle === 'queued'
            ? 'Draft'
            : snapshot.run.lifecycle.replaceAll('-', ' ')}
      </small>
    </a>
  );
}

function WorkbenchRun({
  review,
  reviews,
  update,
  select,
  add,
  reset,
}: {
  review: WorkbenchReview;
  reviews: WorkbenchReview[];
  update: (patch: Partial<WorkbenchReview>) => void;
  select: (id: number) => void;
  add: () => void;
  reset: () => void;
}) {
  const run = useRuntimeSelector((state) => state.run);
  const stale = useRuntimeSelector((state) => state.stale);
  const connection = useRuntimeSelector((state) => state.connection);
  const [view, setView] = useState('review');
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [sizes, setSizes] = useState<readonly [number, number]>([60, 40]);
  const reviewsId = useId();
  const reviewsButton = useRef<HTMLButtonElement>(null);
  const busy = ['running', 'waiting-approval', 'waiting-input', 'paused'].includes(run.lifecycle);
  const decisionUnknown = review.submission === 'outcome-unknown';

  function start(text: string) {
    if (!stale && review.host.start(text)) {
      update({
        title: text.length > 48 ? `${text.slice(0, 48).trimEnd()}…` : text,
        draft: '',
        submission: 'idle',
        commandId: '',
        error: '',
      });
      setInspectorOpen(true);
    }
  }
  function decide(decision: 'approve' | 'reject', proposal: ApprovalProposal) {
    if (review.submission === 'submitting' || decisionUnknown) return;
    const commandId = crypto.randomUUID();
    update({ submission: 'submitting', commandId, error: '' });
    const result = review.host.decide(
      {
        commandId,
        proposalId: proposal.id,
        version: proposal.version,
        actionDigest: proposal.actionDigest,
        decision,
      },
      review.loseAcknowledgement,
    );
    update({
      submission:
        result.reason === 'outcome-unknown'
          ? 'outcome-unknown'
          : result.accepted
            ? 'acknowledged'
            : 'failed',
      commandId,
      error: result.reason === 'outcome-unknown' ? '' : (result.reason ?? ''),
    });
  }
  const inspector = <WorkbenchInspector review={review} update={update} decide={decide} />;
  const conversation = <WorkbenchConversation review={review} update={update} start={start} />;
  return (
    <div className={s.app} data-template-preview="workbench">
      <header className={s.appHeader}>
        <div className={s.workspaceName}>
          <RadiobuttonIcon width={15} height={15} aria-hidden="true" />
          <strong>Fieldwork</strong>
          <span>Customer operations</span>
        </div>
        <span className={s.simulation}>Simulated server · no external changes</span>
      </header>
      <div className={s.appBody}>
        <aside className={s.sidebar}>
          <div className={s.sidebarActions}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                add();
                setView('review');
                setReviewsOpen(false);
              }}
              disabled={reviews.length >= 8}
            >
              <PlusIcon width={15} height={15} aria-hidden="true" /> New review
            </Button>
            <button
              ref={reviewsButton}
              className={s.reviewToggle}
              aria-expanded={reviewsOpen}
              aria-controls={reviewsId}
              onClick={() => setReviewsOpen(!reviewsOpen)}
            >
              Reviews <ChevronDownIcon width={15} height={15} aria-hidden="true" />
            </button>
          </div>
          <div id={reviewsId} className={s.reviewNavigation} data-open={reviewsOpen}>
            <p className={s.reviewListHeading}>
              Local reviews <span>{reviews.length}/8</span>
            </p>
            <nav
              aria-label="Local reviews"
              onKeyDown={(event) => {
                if (event.key === 'Escape' && reviewsOpen) {
                  event.stopPropagation();
                  setReviewsOpen(false);
                  reviewsButton.current?.focus();
                }
              }}
            >
              {reviews.map((item) => (
                <ReviewLink
                  key={item.id}
                  review={item}
                  selected={review.id === item.id}
                  onSelect={() => {
                    select(item.id);
                    setView('review');
                    setReviewsOpen(false);
                    if (reviewsOpen) reviewsButton.current?.focus();
                  }}
                />
              ))}
            </nav>
            <p>Reviews and drafts stay in this tab until you reload.</p>
          </div>
          <div className={s.sidebarFooter}>
            <span className={s.connectionDot} data-connected={connection === 'connected'} />
            <span>
              {connection === 'connected' ? 'Demo server connected' : 'Demo server disconnected'}
            </span>
          </div>
        </aside>
        <section className={s.workspace} aria-label="Account review workspace">
          <div className={s.workspaceHeader}>
            <div>
              <span className={s.eyebrow}>Demo workspace</span>
              <h2>{review.title}</h2>
            </div>
            <div className={s.headerActions}>
              <StatusBadge state={run.lifecycle} />
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                disabled={busy || stale || decisionUnknown}
                aria-label="Reset this review"
                title="Reset this review"
              >
                <ResetIcon width={15} height={15} aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-pressed={inspectorOpen}
                onClick={() => setInspectorOpen(!inspectorOpen)}
              >
                <ViewVerticalIcon width={15} height={15} aria-hidden="true" /> Inspector
              </Button>
            </div>
          </div>
          <div className={s.tabs}>
            <Tabs
              label="Workbench views"
              value={view}
              onValueChange={setView}
              items={[
                {
                  value: 'review',
                  label: 'Review',
                  content: (
                    <div className={s.reviewSurface} data-inspector={inspectorOpen}>
                      {inspectorOpen ? (
                        <SplitPane
                          label="Review and inspector"
                          resizeLabel="Resize review and inspector"
                          className={s.split}
                          presentation="responsive"
                          stackAt={700}
                          sizes={sizes}
                          onSizesChange={setSizes}
                          primary={{
                            id: 'conversation',
                            label: 'Conversation',
                            minSize: 40,
                            maxSize: 72,
                            children: conversation,
                          }}
                          secondary={{
                            id: 'inspector',
                            label: 'Run inspector',
                            minSize: 28,
                            maxSize: 60,
                            scroll: 'auto',
                            children: inspector,
                          }}
                        />
                      ) : (
                        conversation
                      )}
                    </div>
                  ),
                },
                { value: 'accounts', label: 'Accounts', content: <WorkbenchAccounts /> },
                {
                  value: 'activity',
                  label: 'Activity',
                  content: <WorkbenchActivity review={review} />,
                },
              ]}
            />
          </div>
        </section>
      </div>
      <footer className={s.appFooter}>
        <span>3 fixed synthetic accounts · server validates each approval</span>
        <span>No model or backend connected</span>
      </footer>
    </div>
  );
}

export function Workbench() {
  const [reviews, setReviews] = useState<WorkbenchReview[]>(() => [createReview(1)]);
  const [selectedId, setSelectedId] = useState(1);
  const hosts = useRef(reviews.map((review) => review.host));
  const nextId = useRef(2);
  const review = reviews.find((item) => item.id === selectedId)!;
  useEffect(
    () => () => {
      hosts.current.forEach((host) => host.cancel());
    },
    [],
  );
  function update(patch: Partial<WorkbenchReview>) {
    setReviews((current) =>
      current.map((item) => (item.id === selectedId ? { ...item, ...patch } : item)),
    );
  }
  function add() {
    if (reviews.length >= 8) return;
    const next = createReview(nextId.current++);
    hosts.current.push(next.host);
    setReviews((current) => [...current, next]);
    setSelectedId(next.id);
  }
  function reset() {
    const next = createReview(selectedId);
    next.title = 'Account review';
    review.host.dispose();
    hosts.current = hosts.current.filter((host) => host !== review.host);
    hosts.current.push(next.host);
    setReviews((current) => current.map((item) => (item.id === selectedId ? next : item)));
  }
  return (
    <RuntimeProvider runtime={review.host.runtime}>
      <WorkbenchRun
        review={review}
        reviews={reviews}
        update={update}
        select={setSelectedId}
        add={add}
        reset={reset}
      />
    </RuntimeProvider>
  );
}
