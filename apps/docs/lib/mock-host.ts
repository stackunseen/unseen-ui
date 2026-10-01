import { createRuntime, validateApprovalDecision, messageText } from '@ai-interaction/core';
import type { ApprovalDecision, Event, RuntimeSnapshot } from '@ai-interaction/core';
import { artifact, initialSnapshot, proposal, source, steps, tool } from './fixtures';

type EventBody = Event extends infer E
  ? E extends Event
    ? Pick<E, 'type' | 'payload'>
    : never
  : never;
/** In-memory simulation only. Real authorization, storage and effects belong on a host server. */
export function createMockHost() {
  const runtime = createRuntime(initialSnapshot());
  let authoritative = initialSnapshot();
  let seq = 0;
  let generation = 0;
  let connected = true;
  let permissionGranted = true;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const commands = new Map<
    string,
    { fingerprint: string; result: { accepted: boolean; reason?: string } }
  >();
  function event(body: EventBody) {
    if (disposed) return;
    const envelope = {
      schemaVersion: 1,
      eventId: `e-${generation}-${++seq}`,
      streamId: authoritative.streamId,
      sequence: seq,
      threadId: authoritative.run.threadId,
      runId: authoritative.run.id,
      attemptId: authoritative.run.attemptId,
      occurredAt: '2026-09-29T12:00:00.000Z',
    } as const;
    // Maintain a separate authority even when the UI transport is disconnected.
    const projector = createRuntime(authoritative);
    if (projector.ingest({ ...envelope, ...body }) !== 'applied') {
      const message = projector.getSnapshot().diagnostic;
      projector.dispose();
      throw new Error(message ?? 'Mock host event rejected.');
    }
    authoritative = projector.getSnapshot();
    projector.dispose();
    if (connected) runtime.ingest({ ...envelope, ...body });
  }
  function transition(lifecycle: RuntimeSnapshot['run']['lifecycle'], activity?: string) {
    event({
      type: 'run.updated',
      payload: { lifecycle, version: authoritative.run.version + 1, activity },
    });
  }
  function stopTimer() {
    clearTimeout(timer);
    timer = undefined;
  }
  function start(prompt: string) {
    if (
      disposed ||
      !['queued', 'succeeded', 'failed', 'cancelled'].includes(authoritative.run.lifecycle)
    )
      return false;
    stopTimer();
    generation++;
    seq = 0;
    commands.clear();
    connected = true;
    permissionGranted = true;
    authoritative = {
      ...initialSnapshot(),
      streamId: `stream-${generation}`,
      run: { ...initialSnapshot().run, attemptId: `attempt-${generation}` },
    };
    runtime.replaceSnapshot(authoritative);
    transition('running', 'Reviewing the demo dataset');
    event({
      type: 'message.created',
      payload: {
        id: 'user-message',
        role: 'user',
        text: prompt.slice(0, 20_000),
        state: 'complete',
        revision: 0,
      },
    });
    event({
      type: 'message.created',
      payload: {
        id: 'assistant-message',
        role: 'assistant',
        text: '',
        state: 'streaming',
        revision: 0,
      },
    });
    const words =
      'I found 3 inactive accounts in the simulated dataset. The operations handbook recommends an owner review before archival. Please review the proposed change below.'.split(
        ' ',
      );
    const current = generation;
    let i = 0;
    function tick() {
      if (disposed || generation !== current || authoritative.run.lifecycle !== 'running') return;
      const text = (i === 0 ? '' : ' ') + words[i++];
      const offset = messageText(
        authoritative.messages.find((m) => m.id === 'assistant-message')!,
      ).length;
      event({ type: 'message.delta', payload: { id: 'assistant-message', offset, text } });
      if (i < words.length) timer = setTimeout(tick, 42);
      else {
        event({ type: 'message.completed', payload: { id: 'assistant-message' } });
        for (const step of steps) event({ type: 'step.updated', payload: step });
        event({ type: 'tool.updated', payload: tool });
        event({
          type: 'tool.updated',
          payload: {
            id: 'archive-accounts',
            name: 'archive_accounts',
            state: 'approval-required',
            revision: 0,
            input: '{"account_ids":["demo-1","demo-2","demo-3"]}',
          },
        });
        event({ type: 'source.updated', payload: source });
        event({
          type: 'approval.requested',
          payload: { ...proposal, expiresAt: new Date(Date.now() + 300_000).toISOString() },
        });
        transition('waiting-approval', 'Waiting for an owner decision');
      }
    }
    timer = setTimeout(tick, 180);
    return true;
  }
  function decide(
    command: ApprovalDecision,
    loseAcknowledgement = false,
  ): { accepted: boolean; reason?: string } {
    if (disposed) return { accepted: false, reason: 'Demo host stopped.' };
    const fingerprint = JSON.stringify(command);
    const old = commands.get(command.commandId);
    if (old)
      return old.fingerprint === fingerprint
        ? old.result
        : { accepted: false, reason: 'Command identifier was reused with different content.' };
    if (!permissionGranted)
      return { accepted: false, reason: 'Access was revoked. Start a new authorized review.' };
    if (!authoritative.approval) return { accepted: false, reason: 'No proposal is available.' };
    const validation = validateApprovalDecision(authoritative.approval, command, Date.now());
    if (!validation.ok) return { accepted: false, reason: validation.reason };
    const result = { accepted: true };
    commands.set(command.commandId, { fingerprint, result });
    if (loseAcknowledgement) disconnect();
    event({
      type: 'approval.resolved',
      payload: {
        id: command.proposalId,
        version: command.version,
        status: command.decision === 'approve' ? 'approved' : 'rejected',
      },
    });
    const call = authoritative.tools.find((t) => t.id === authoritative.approval?.toolCallId)!;
    event({
      type: 'tool.updated',
      payload: {
        ...call,
        revision: call.revision + 1,
        state: command.decision === 'approve' ? 'running' : 'denied',
      },
    });
    transition('running', 'Preparing the review summary');
    if (command.decision === 'approve') {
      const running = authoritative.tools.find((t) => t.id === call.id)!;
      event({
        type: 'tool.updated',
        payload: {
          ...running,
          revision: running.revision + 1,
          state: 'succeeded',
          output: 'Simulated archival complete. No external account was modified.',
        },
      });
    }
    event({
      type: 'step.updated',
      payload: {
        ...steps[2]!,
        state: 'succeeded',
        detail:
          command.decision === 'approve'
            ? 'Host acknowledged approval.'
            : 'Host acknowledged rejection; archival skipped.',
      },
    });
    event({ type: 'step.updated', payload: { ...steps[3]!, state: 'succeeded' } });
    event({
      type: 'artifact.created',
      payload: {
        ...artifact,
        content: `Account review\n\n${authoritative.approval?.title}\n${authoritative.approval?.impact}\n\nEvidence: Customer operations handbook, section 4.\n\nDecision: ${command.decision === 'approve' ? 'approved; simulated archival completed' : 'rejected; accounts left unchanged'}.\n\nThis is fixture data. No external system was accessed.`,
      },
    });
    transition('succeeded');
    if (loseAcknowledgement) return { accepted: false, reason: 'outcome-unknown' };
    return result;
  }
  function disconnect() {
    connected = false;
    runtime.setConnection('disconnected');
  }
  return {
    runtime,
    start,
    decide,
    disconnect,
    revokePermission() {
      if (disposed || !permissionGranted) return;
      permissionGranted = false;
      stopTimer();
      for (const item of authoritative.sources) {
        event({
          type: 'source.updated',
          payload: { ...item, access: 'revoked', excerpt: undefined, url: undefined },
        });
      }
      if (authoritative.approval?.status === 'pending') {
        event({
          type: 'approval.resolved',
          payload: {
            id: authoritative.approval.id,
            version: authoritative.approval.version,
            status: 'superseded',
          },
        });
      }
      for (const call of authoritative.tools) {
        if (['queued', 'input-streaming', 'approval-required', 'running'].includes(call.state)) {
          event({
            type: 'tool.updated',
            payload: {
              ...call,
              revision: call.revision + 1,
              state: call.state === 'approval-required' ? 'denied' : 'cancelled',
            },
          });
        }
      }
      if (!['queued', 'succeeded', 'failed', 'cancelled'].includes(authoritative.run.lifecycle)) {
        event({
          type: 'step.updated',
          payload: {
            ...steps[2]!,
            state: 'blocked',
            detail: 'Access was revoked. The pending action cannot execute.',
          },
        });
        transition('cancelled', 'Access was revoked. Start a new authorized review.');
      }
    },
    reconnect() {
      if (disposed) return;
      connected = true;
      runtime.replaceSnapshot({
        ...authoritative,
        connection: 'connected',
        stale: false,
        diagnostic: null,
      });
    },
    reconcile(commandId: string) {
      this.reconnect();
      return (
        commands.get(commandId)?.result ?? { accepted: false, reason: 'No decision was recorded.' }
      );
    },
    revise() {
      if (authoritative.approval?.status === 'pending') {
        const call = authoritative.tools.find((t) => t.id === authoritative.approval?.toolCallId);
        if (!call) return;
        // Replacement call identity preserves the earlier proposal's exact arguments.
        event({
          type: 'tool.updated',
          payload: { ...call, revision: call.revision + 1, state: 'cancelled' },
        });
        const replacementId = `archive-accounts-v${authoritative.approval.version + 1}`;
        event({
          type: 'tool.updated',
          payload: {
            id: replacementId,
            name: 'archive_accounts',
            revision: 0,
            state: 'approval-required',
            input: '{"account_ids":["demo-1","demo-2"]}',
          },
        });
        event({
          type: 'approval.requested',
          payload: {
            ...authoritative.approval,
            toolCallId: replacementId,
            version: authoritative.approval.version + 1,
            actionDigest: `fixture-revised-${authoritative.approval.version + 1}`,
            title: 'Archive 2 inactive accounts',
            impact: 'Scope changed to 2 demo accounts. Review this replacement proposal.',
          },
        });
      }
    },
    cancel() {
      if (['queued', 'succeeded', 'failed', 'cancelled'].includes(authoritative.run.lifecycle))
        return;
      stopTimer();
      if (authoritative.approval?.status === 'pending')
        event({
          type: 'approval.resolved',
          payload: {
            id: authoritative.approval.id,
            version: authoritative.approval.version,
            status: 'superseded',
          },
        });
      authoritative = {
        ...authoritative,
        messages: authoritative.messages.map((m) =>
          m.state === 'streaming' ? { ...m, state: 'interrupted' } : m,
        ),
      };
      transition('cancelled');
      if (connected) runtime.replaceSnapshot(authoritative);
    },
    dispose() {
      disposed = true;
      stopTimer();
      runtime.dispose();
    },
  };
}
export type MockHost = ReturnType<typeof createMockHost>;
