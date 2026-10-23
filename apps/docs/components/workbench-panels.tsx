'use client';

import { useMemo, useRef, useState } from 'react';
import {
  ActivityLogIcon,
  ArrowTopRightIcon,
  CheckCircledIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  ReaderIcon,
} from '@radix-ui/react-icons';
import {
  Accordion,
  AgentSteps,
  AIIcon,
  ApprovalCard,
  ArtifactPanel,
  Button,
  Citation,
  ConnectionStatus,
  ContextBar,
  MessageActions,
  PromptInput,
  StatusBadge,
  Suggestions,
  Tabs,
  ToolCall,
  useRuntimeSelector,
} from '@stackunseen/ui';
import { ConversationViewport } from '@stackunseen/ui/viewport';
import { messageText } from '@stackunseen/ui-core';
import type { ApprovalProposal } from '@stackunseen/ui-core';
import type { ConversationHistory } from '@stackunseen/ui-core/history';
import type { WorkbenchReview } from './workbench';
import s from './workbench.module.css';

type ReviewProps = { review: WorkbenchReview; update: (patch: Partial<WorkbenchReview>) => void };

export function WorkbenchConversation({
  review,
  update,
  start,
}: ReviewProps & { start: (text: string) => void }) {
  const snapshot = useRuntimeSelector((state) => state);
  const { messages, run, stale, sources, streamId, lastSequence } = snapshot;
  const history = useMemo<ConversationHistory>(
    () => ({
      context: {
        workspaceId: 'simulated-workbench',
        threadId: `review-${review.id}`,
        branchId: run.attemptId,
        snapshotId: streamId,
        version: String(lastSequence),
      },
      messages,
      older: { state: 'end' },
      newer: { state: 'end' },
      startIndex: 0,
      totalMessages: messages.length,
    }),
    [review.id, run.attemptId, streamId, lastSequence, messages],
  );
  const busy = ['running', 'waiting-approval', 'waiting-input', 'paused'].includes(run.lifecycle);
  return (
    <div className={s.conversation}>
      {stale && (
        <div className={s.connection}>
          <ConnectionStatus
            variant="banner"
            value={{
              state: snapshot.connection,
              recovery: 'none',
              freshness: 'stale',
              adapter: {
                name: 'In-memory demo server',
                version: '1',
                resume: false,
                snapshot: true,
              },
              cursor: { streamId, sequence: lastSequence },
              detail: snapshot.diagnostic ?? undefined,
            }}
            onRefresh={() => review.host.reconnect()}
          />
        </div>
      )}
      <ConversationViewport
        className={s.transcript}
        mode="reading"
        value={history}
        label="Account review conversation"
        availability={stale ? 'stale' : 'ready'}
        empty={
          <div className={s.emptyConversation}>
            <span className={s.assistantMark}>
              <AIIcon name="assistant" />
            </span>
            <h3>Review before you act.</h3>
            <p>
              Search three demo accounts, inspect the evidence, then approve or reject the proposed
              archival.
            </p>
            <span>Try the full workflow or explore recovery in the inspector.</span>
          </div>
        }
        renderActions={(message) =>
          message.role === 'assistant' && message.state === 'complete' ? (
            <>
              <div className={s.citations}>
                {sources.map((source, index) => (
                  <Citation key={source.id} source={source} number={index + 1} />
                ))}
              </div>
              <MessageActions text={messageText(message)} />
            </>
          ) : undefined
        }
      />
      {run.lifecycle === 'cancelled' && (
        <p role="status" className={s.runNotice}>
          {run.activity || 'Review stopped. Your partial conversation is retained.'}
        </p>
      )}
      {run.lifecycle === 'waiting-approval' && !stale && (
        <p role="status" className={s.runNotice}>
          An owner decision is needed. Open the inspector to review the action.
        </p>
      )}
      {run.lifecycle === 'succeeded' && (
        <p role="status" className={s.runNotice}>
          <CheckCircledIcon width={15} height={15} aria-hidden="true" /> Review complete. The
          inspector contains the acknowledged result and report.
        </p>
      )}
      <div className={s.composer}>
        {!messages.length && (
          <Suggestions
            items={['Review inactive accounts', 'Prepare an account archival review']}
            disabled={busy || stale}
            onSelect={(draft) => update({ draft })}
          />
        )}
        <PromptInput
          variant="compact"
          value={review.draft}
          onValueChange={(draft) => update({ draft })}
          busy={busy}
          disabled={stale}
          disabledReason={stale ? 'Reconnect before starting another review.' : undefined}
          onCancel={() => review.host.cancel()}
          onSubmit={start}
          placeholder="Describe an account review…"
          toolbar={
            <span className={s.composerContext}>
              <ReaderIcon width={15} height={15} aria-hidden="true" /> Operations handbook
            </span>
          }
        />
      </div>
    </div>
  );
}

export function WorkbenchInspector({
  review,
  update,
  decide,
}: ReviewProps & { decide: (decision: 'approve' | 'reject', proposal: ApprovalProposal) => void }) {
  const { run, steps, tools, approval, stale, artifacts, sources, connection } = useRuntimeSelector(
    (state) => state,
  );
  const [tab, setTab] = useState('run');
  const [artifactOpen, setArtifactOpen] = useState(false);
  const pending = approval?.status === 'pending';
  const unknown = review.submission === 'outcome-unknown';
  return (
    <div className={s.inspector}>
      <div className={s.inspectorHeading}>
        <h3>
          <ActivityLogIcon width={15} height={15} aria-hidden="true" /> Inspector
        </h3>
        <span>Host events</span>
      </div>
      <Tabs
        label="Inspector views"
        value={tab}
        onValueChange={setTab}
        items={[
          {
            value: 'run',
            label: 'Run',
            content: (
              <div className={s.inspectorContent}>
                {approval && (
                  <ApprovalCard
                    variant="banner"
                    proposal={approval}
                    stale={stale && approval.status === 'pending' && !unknown}
                    submission={review.submission}
                    error={review.error}
                    onDecision={decide}
                    onReconcile={() => {
                      const result = review.host.reconcile(review.commandId);
                      update({
                        submission: result.accepted ? 'acknowledged' : 'failed',
                        error: result.reason ?? '',
                      });
                    }}
                  />
                )}
                {!steps.length && (
                  <div className={s.emptyInspector}>
                    <LockClosedIcon width={30} height={30} aria-hidden="true" />
                    <h4>
                      {run.lifecycle === 'running'
                        ? 'Reviewing demo accounts'
                        : 'Ready for a review'}
                    </h4>
                    <p>
                      {run.lifecycle === 'running'
                        ? 'The demo server is streaming a response. Its execution steps will appear when the search completes.'
                        : 'Tool results, owner decisions and the final report appear here.'}
                    </p>
                  </div>
                )}
                {!!steps.length && (
                  <section className={s.inspectorSection}>
                    <h4>Execution steps</h4>
                    <AgentSteps variant="compact" steps={steps} />
                  </section>
                )}
                {!!tools.length && (
                  <section className={s.inspectorSection}>
                    <h4>Tool calls</h4>
                    {tools.map((tool) => (
                      <ToolCall key={tool.id} variant="compact" value={tool} />
                    ))}
                  </section>
                )}
                {artifacts[0] && (
                  <section className={s.inspectorSection}>
                    <h4>Output</h4>
                    <ArtifactPanel
                      artifact={artifacts[0]}
                      open={artifactOpen}
                      onOpenChange={setArtifactOpen}
                    />
                  </section>
                )}
                <Accordion
                  type="single"
                  collapsible
                  region={false}
                  className={s.recovery}
                  items={[
                    {
                      value: 'recovery',
                      title: 'Recovery scenarios',
                      content: (
                        <div className={s.recoveryContent}>
                          <label>
                            <input
                              type="checkbox"
                              checked={review.loseAcknowledgement}
                              disabled={!pending || stale || unknown}
                              onChange={(event) =>
                                update({ loseAcknowledgement: event.target.checked })
                              }
                            />{' '}
                            Lose the next decision acknowledgement
                          </label>
                          <p>
                            Send a decision, then check its recorded status. The server executes
                            once.
                          </p>
                          <div className={s.recoveryActions}>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={connection !== 'connected'}
                              onClick={() => review.host.disconnect()}
                            >
                              Disconnect
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={connection === 'connected'}
                              onClick={() => review.host.reconnect()}
                            >
                              Reconnect
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!pending || stale || unknown}
                              onClick={() => {
                                review.host.revise();
                                update({ submission: 'idle', commandId: '', error: '' });
                              }}
                            >
                              Revise scope
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!pending || stale || unknown}
                              onClick={() => review.host.revokePermission()}
                            >
                              Revoke access
                            </Button>
                          </div>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            ),
          },
          {
            value: 'context',
            label: 'Context',
            content: (
              <div className={s.inspectorContent}>
                <section className={s.inspectorSection}>
                  <h4>Included context</h4>
                  <ContextBar
                    items={[
                      {
                        id: 'handbook',
                        label: 'Operations handbook',
                        state: sources.some((source) => source.access === 'revoked')
                          ? 'excluded'
                          : 'included',
                        reason: sources.some((source) => source.access === 'revoked')
                          ? 'Access revoked by the demo server'
                          : 'Fixed synthetic context for this template',
                      },
                    ]}
                  />
                  <p className={s.contextDescription}>
                    Accounts with no activity for 90 days require an owner review before archival.
                  </p>
                </section>
                <dl className={s.contextDetails}>
                  <dt>Environment</dt>
                  <dd>CRM sandbox</dd>
                  <dt>Records</dt>
                  <dd>3 synthetic accounts</dd>
                  <dt>Allowed action</dt>
                  <dd>accounts:archive</dd>
                  <dt>Persistence</dt>
                  <dd>Memory in this browser tab</dd>
                  <dt>Connection</dt>
                  <dd>{connection}</dd>
                </dl>
                <p className={s.contextDescription}>
                  Free text changes the review title. Every request searches the same demo records;
                  no model interprets your prompt.
                </p>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

const accounts = [
  { id: 'demo-1', name: 'Acme Sandbox', owner: 'Morgan Lee', days: 104, plan: 'Team' },
  { id: 'demo-2', name: 'Example Studio', owner: 'Avery Shah', days: 128, plan: 'Business' },
  { id: 'demo-3', name: 'Demo Works', owner: 'Jordan Reed', days: 96, plan: 'Team' },
];

export function WorkbenchAccounts() {
  const snapshot = useRuntimeSelector((state) => state);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string>();
  const detailTrigger = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const visible = accounts.filter((account) =>
    `${account.name} ${account.owner}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const detail = accounts.find((account) => account.id === selected);
  function archived(id: string) {
    return snapshot.tools.some(
      (tool) =>
        tool.name === 'archive_accounts' &&
        tool.state === 'succeeded' &&
        tool.input.includes(`"${id}"`),
    );
  }
  return (
    <div className={s.records}>
      <div className={s.recordsHeading}>
        <div>
          <h3>Accounts</h3>
          <p>The fixed dataset used by this review.</p>
        </div>
        <label className={s.search}>
          <MagnifyingGlassIcon width={15} height={15} aria-hidden="true" />
          <input
            ref={searchInput}
            aria-label="Search demo accounts"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelected(undefined);
            }}
            placeholder="Search accounts or owners"
          />
        </label>
      </div>
      <p className={s.tableHint}>Scroll sideways to see every column.</p>
      <div className={s.tableScroll} tabIndex={0} role="region" aria-label="Demo accounts table">
        <table className={s.accountTable}>
          <thead>
            <tr>
              <th scope="col">Account</th>
              <th scope="col">Owner</th>
              <th scope="col">Last activity</th>
              <th scope="col">State</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((account) => (
              <tr key={account.id}>
                <th scope="row">
                  <button
                    aria-expanded={selected === account.id}
                    onClick={(event) => {
                      detailTrigger.current = event.currentTarget;
                      setSelected(selected === account.id ? undefined : account.id);
                    }}
                  >
                    {account.name}
                    <ArrowTopRightIcon width={15} height={15} aria-hidden="true" />
                  </button>
                  <small>
                    {account.id} · {account.plan}
                  </small>
                </th>
                <td>{account.owner}</td>
                <td>{account.days} days ago</td>
                <td>
                  {archived(account.id)
                    ? snapshot.stale
                      ? 'Archived in demo · stale'
                      : 'Archived in demo'
                    : snapshot.stale
                      ? 'Unconfirmed'
                      : 'Inactive'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visible.length && (
        <div className={s.recordsEmpty}>
          <p>No accounts match “{search}”.</p>
          <Button variant="outline" size="sm" onClick={() => setSearch('')}>
            Clear search
          </Button>
        </div>
      )}
      {detail && (
        <section className={s.accountDetail} aria-label={`${detail.name} details`}>
          <div>
            <h4>{detail.name}</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelected(undefined);
                (detailTrigger.current?.isConnected
                  ? detailTrigger.current
                  : searchInput.current
                )?.focus();
              }}
            >
              Close details
            </Button>
          </div>
          <p>
            {detail.owner} owns this {detail.plan.toLowerCase()} account. Its last recorded activity
            was {detail.days} days ago.{' '}
            {archived(detail.id)
              ? 'Archival was acknowledged by the demo server.'
              : 'It meets the 90-day threshold for an owner review.'}
          </p>
          <p>Record: {detail.id} · Workspace: CRM sandbox</p>
        </section>
      )}
    </div>
  );
}

export function WorkbenchActivity({ review }: { review: WorkbenchReview }) {
  const { run, approval, artifacts, stale, tools } = useRuntimeSelector((state) => state);
  return (
    <div className={s.activity}>
      <h3>Activity</h3>
      <p>Public events for the selected review. No private reasoning is shown.</p>
      {run.lifecycle === 'queued' ? (
        <div className={s.recordsEmpty}>
          <ActivityLogIcon width={30} height={30} aria-hidden="true" />
          <h4>No activity yet</h4>
          <p>Send a review request to begin.</p>
        </div>
      ) : (
        <ol className={s.activityList}>
          <li>
            <strong>Review requested</strong>
            <span>{review.title}</span>
            <StatusBadge state={run.lifecycle} />
          </li>
          {tools
            .filter((tool) => tool.name === 'search_accounts')
            .map((tool) => (
              <li key={tool.id}>
                <strong>Demo accounts searched</strong>
                <span>3 fixed records returned by the simulated server.</span>
                <StatusBadge state={tool.state} />
              </li>
            ))}
          {approval && (
            <li>
              <strong>{approval.title}</strong>
              <span>Proposal version {approval.version} · accounts:archive</span>
              <StatusBadge
                state={
                  review.submission === 'outcome-unknown' ? 'outcome-unknown' : approval.status
                }
                label={
                  stale && review.submission !== 'outcome-unknown'
                    ? `${approval.status} · stale`
                    : undefined
                }
              />
            </li>
          )}
          {review.submission === 'outcome-unknown' && (
            <li>
              <strong>Decision acknowledgement lost</strong>
              <span>
                Open the inspector and check the original decision status before retrying.
              </span>
            </li>
          )}
          {!!artifacts.length && (
            <li>
              <strong>Review report prepared</strong>
              <span>The server acknowledged the decision and produced a synthetic report.</span>
            </li>
          )}
          {run.lifecycle === 'cancelled' && (
            <li>
              <strong>Review stopped</strong>
              <span>{run.activity || 'The partial conversation remains available.'}</span>
            </li>
          )}
        </ol>
      )}
    </div>
  );
}
