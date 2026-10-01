'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, BookOpen, ShieldCheck } from 'lucide-react';
import {
  AgentSteps,
  Accordion,
  AIIcon,
  ApprovalCard,
  ArtifactPanel,
  Button,
  Citation,
  ContextBar,
  ConnectionStatus,
  MessageActions,
  PromptInput,
  RuntimeProvider,
  StatusBadge,
  Suggestions,
  ToolCall,
  useRuntimeSelector,
} from '@ai-interaction/react';
import { ConversationViewport } from '@ai-interaction/react/viewport';
import type { ConversationHistory } from '@ai-interaction/core/history';
import type { ApprovalProposal, SubmissionState } from '@ai-interaction/core';
import { messageText } from '@ai-interaction/core';
import { createMockHost } from '../lib/mock-host';
import type { MockHost } from '../lib/mock-host';

function Conversation({ host }: { host: MockHost }) {
  const messages = useRuntimeSelector((s) => s.messages);
  const run = useRuntimeSelector((s) => s.run);
  const stale = useRuntimeSelector((s) => s.stale);
  const sources = useRuntimeSelector((s) => s.sources);
  const [draft, setDraft] = useState('Find inactive accounts and prepare them for review.');
  const sequence = useRuntimeSelector((s) => s.lastSequence);
  const streamId = useRuntimeSelector((s) => s.streamId);
  const history = useMemo<ConversationHistory>(
    () =>
      Object.freeze({
        context: Object.freeze({
          workspaceId: 'simulated-workbench',
          threadId: run.threadId,
          branchId: run.attemptId,
          snapshotId: streamId,
          version: String(sequence),
        }),
        messages: Object.freeze([...messages]),
        older: Object.freeze({ state: 'end' as const }),
        newer: Object.freeze({ state: 'end' as const }),
        startIndex: 0,
        totalMessages: messages.length,
      }),
    [messages, run.threadId, run.attemptId, streamId, sequence],
  );
  const busy = ['running', 'waiting-approval', 'waiting-input', 'paused'].includes(run.lifecycle);
  return (
    <div className="conversation-pane">
      <div className="pane-heading">
        <div>
          <span className="eyebrow">CUSTOMER OPERATIONS</span>
          <h2>Account review</h2>
        </div>
        <StatusBadge state={run.lifecycle} />
      </div>
      <ConversationViewport
        className="workbench-transcript"
        value={history}
        label="Conversation transcript"
        availability={stale ? 'stale' : 'ready'}
        empty={
          <div className="empty-conversation">
            <span className="assistant-mark">
              <AIIcon name="assistant" />
            </span>
            <h3>A useful next step starts here.</h3>
            <p>
              Try a complete workflow: search, review a proposed action, then inspect its evidence.
            </p>
            <span className="fixture-label">Simulated host · no external changes</span>
          </div>
        }
        renderActions={(message) =>
          message.role === 'assistant' && message.state === 'complete' ? (
            <>
              <div className="citation-row">
                {sources.map((source, i) => (
                  <Citation key={source.id} source={source} number={i + 1} />
                ))}
              </div>
              <MessageActions text={messageText(message)} />
            </>
          ) : undefined
        }
      />
      <div className="composer-area">
        <Suggestions
          items={['Review inactive accounts', 'Show a recovery scenario']}
          disabled={busy}
          onSelect={setDraft}
        />
        <PromptInput
          value={draft}
          onValueChange={setDraft}
          busy={busy}
          disabled={stale}
          disabledReason={stale ? 'Reconnect before starting another request.' : undefined}
          onCancel={() => host.cancel()}
          onSubmit={(text) => {
            if (host.start(text)) setDraft('');
          }}
        />
      </div>
    </div>
  );
}
function Execution({ host }: { host: MockHost }) {
  const steps = useRuntimeSelector((s) => s.steps);
  const tools = useRuntimeSelector((s) => s.tools);
  const proposal = useRuntimeSelector((s) => s.approval);
  const stale = useRuntimeSelector((s) => s.stale);
  const artifacts = useRuntimeSelector((s) => s.artifacts);
  const [submission, setSubmission] = useState<SubmissionState>('idle');
  const [error, setError] = useState('');
  const [loseAck, setLoseAck] = useState(false);
  const commandId = useRef('');
  const [artifactOpen, setArtifactOpen] = useState(false);
  const run = useRuntimeSelector((s) => s.run);
  useEffect(() => {
    setSubmission('idle');
    setError('');
    commandId.current = '';
  }, [run.attemptId, proposal?.version]);
  function decide(decision: 'approve' | 'reject', p: ApprovalProposal) {
    if (submission === 'submitting' || submission === 'outcome-unknown') return;
    setSubmission('submitting');
    setError('');
    commandId.current = crypto.randomUUID();
    const result = host.decide(
      {
        commandId: commandId.current,
        proposalId: p.id,
        version: p.version,
        actionDigest: p.actionDigest,
        decision,
      },
      loseAck,
    );
    if (result.reason === 'outcome-unknown') setSubmission('outcome-unknown');
    else {
      setSubmission(result.accepted ? 'acknowledged' : 'failed');
      setError(result.reason ?? '');
    }
  }
  return (
    <div className="execution-pane">
      <div className="pane-heading">
        <h2>
          <Activity size={16} /> Execution
        </h2>
        <span className="fixture-label">Host events</span>
      </div>
      <div className="execution-content">
        {run.lifecycle === 'cancelled' && run.activity && <p role="status">{run.activity}</p>}
        <AgentSteps steps={steps} />
        {tools.map((tool) => (
          <ToolCall key={tool.id} value={tool} />
        ))}
        {proposal && (
          <ApprovalCard
            proposal={proposal}
            stale={stale && submission !== 'outcome-unknown'}
            submission={submission}
            error={error}
            onDecision={decide}
            onReconcile={() => {
              const r = host.reconcile(commandId.current);
              setSubmission(r.accepted ? 'acknowledged' : 'failed');
              setError(r.reason ?? '');
            }}
          />
        )}
        {artifacts[0] && (
          <ArtifactPanel
            artifact={artifacts[0]}
            open={artifactOpen}
            onOpenChange={setArtifactOpen}
          />
        )}
        {!proposal && !tools.length && (
          <div className="execution-placeholder">
            <ShieldCheck size={24} />
            <p>Every action has a visible state.</p>
            <small>Tool calls, approval requests and results will appear here.</small>
          </div>
        )}
        <Accordion
          type="single"
          collapsible
          className="scenario-controls"
          items={[
            {
              value: 'recovery',
              title: 'Test recovery states',
              content: (
                <>
                  <label>
                    <input
                      type="checkbox"
                      checked={loseAck}
                      onChange={(e) => setLoseAck(e.target.checked)}
                    />
                    Lose approval acknowledgement
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => host.disconnect()}>
                      Disconnect
                    </Button>
                    <Button variant="outline" onClick={() => host.reconnect()}>
                      Reconnect
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!proposal || proposal.status !== 'pending'}
                      onClick={() => host.revise()}
                    >
                      Revise proposal
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!proposal || proposal.status !== 'pending'}
                      onClick={() => host.revokePermission()}
                    >
                      Revoke access
                    </Button>
                  </div>
                  <p>These controls affect only this in-memory simulation.</p>
                </>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
function ConnectionDetails({ host }: { host: MockHost }) {
  const connection = useRuntimeSelector((s) => s.connection);
  const stale = useRuntimeSelector((s) => s.stale);
  const streamId = useRuntimeSelector((s) => s.streamId);
  const sequence = useRuntimeSelector((s) => s.lastSequence);
  const diagnostic = useRuntimeSelector((s) => s.diagnostic);
  return (
    <ConnectionStatus
      variant="banner"
      value={{
        state: connection,
        recovery: 'none',
        freshness: stale ? 'stale' : 'current',
        adapter: { name: 'In-memory demo host', version: '1', resume: false, snapshot: true },
        cursor: { streamId, sequence },
        detail: diagnostic ?? undefined,
      }}
      onRefresh={() => host.reconnect()}
    />
  );
}
function Connection({ host }: { host: MockHost }) {
  const interrupted = useRuntimeSelector(
    (s) => s.stale || s.connection !== 'connected' || !!s.diagnostic,
  );
  return interrupted ? <ConnectionDetails host={host} /> : null;
}
function WorkbenchContext() {
  const sources = useRuntimeSelector((s) => s.sources);
  const revoked = sources.some((source) => source.access === 'revoked');
  return (
    <div className="context-strip">
      <BookOpen size={16} />
      <ContextBar
        items={[
          {
            id: 'handbook',
            label: 'Operations handbook',
            state: revoked ? 'excluded' : 'included',
            reason: revoked ? 'Access revoked by the simulated host' : 'Synthetic demo context',
          },
        ]}
      />
    </div>
  );
}
export function Workbench() {
  const [host] = useState(createMockHost);
  // This instance is owned by the page; stopping timers on unmount avoids orphan streams.
  useEffect(
    () => () => {
      host.cancel();
    },
    [host],
  );
  return (
    <RuntimeProvider runtime={host.runtime}>
      <Connection host={host} />
      <div className="workbench">
        <Conversation host={host} />
        <Execution host={host} />
      </div>
      <WorkbenchContext />
    </RuntimeProvider>
  );
}
