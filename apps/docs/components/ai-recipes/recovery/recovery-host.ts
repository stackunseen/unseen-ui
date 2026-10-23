import { createRuntime, messageText } from '@stackunseen/ui-core';
import type { ConnectionInfo, Event, RuntimeSnapshot, SubmissionState } from '@stackunseen/ui-core';
import type {
  AdapterCommand,
  AdapterCommandRecord,
  AdapterReceipt,
} from '@stackunseen/ui-core/adapter';
import { initialDraft, initialSnapshot, responseChunks, scopeFor } from './fixtures';

export interface RecoveryState {
  readonly runtime: RuntimeSnapshot;
  readonly connection: ConnectionInfo;
  readonly commands: readonly AdapterCommandRecord[];
  readonly draft: string;
  readonly refresh: SubmissionState;
  readonly refreshId: number;
  readonly scenario: 'received' | 'lost' | 'rejected';
  readonly lookupUnavailable: boolean;
  readonly notice: string;
  readonly error?: string;
  readonly dispatches: number;
  readonly lookups: number;
}

const exactCommand = (command: AdapterCommand) =>
  JSON.stringify([
    command.commandId,
    command.scope.workspaceId,
    command.scope.threadId,
    command.scope.branchId,
    command.scope.runId,
    command.scope.attemptId,
    command.scope.streamId,
    command.scope.schemaVersion,
    command.expectedRunVersion,
    command.operation,
    command.payload,
  ]);
const unresolved = (record: AdapterCommandRecord) =>
  record.state === 'submitting' || record.state === 'outcome-unknown';

/** Deterministic in-memory host. Every acknowledgement, execution and refresh is explicit. */
export function createRecoveryHost() {
  const runtime = createRuntime(initialSnapshot());
  const listeners = new Set<() => void>();
  const receipts = new Map<string, AdapterReceipt>();
  const acknowledgementModes = new Map<string, RecoveryState['scenario']>();
  const applied = new Set<string>();
  let scope = scopeFor(1);
  let attempt = 1;
  let commandNumber = 0;
  let chunk = 0;
  let lastEvent: Event | undefined;
  let state: RecoveryState = Object.freeze({
    runtime: runtime.getSnapshot(),
    connection: connection('connected', 'current'),
    commands: Object.freeze([]),
    draft: initialDraft,
    refresh: 'idle',
    refreshId: 0,
    scenario: 'received',
    lookupUnavailable: false,
    dispatches: 0,
    lookups: 0,
    notice: 'Seeded partial response. Use the server controls to deliver each next event.',
  });
  function connection(
    transport: ConnectionInfo['state'],
    freshness: ConnectionInfo['freshness'],
  ): ConnectionInfo {
    return Object.freeze({
      state: transport,
      freshness,
      recovery: 'none',
      adapter: Object.freeze({
        name: 'Simulated in-memory server',
        version: '1',
        resume: false,
        snapshot: true,
      }),
      cursor: Object.freeze({
        streamId: freshness === 'current' ? runtime.getSnapshot().streamId : state.runtime.streamId,
        sequence:
          freshness === 'current' ? runtime.getSnapshot().lastSequence : state.runtime.lastSequence,
      }),
    });
  }
  function publish(patch: Partial<RecoveryState>) {
    state = Object.freeze({ ...state, ...patch });
    listeners.forEach((listener) => listener());
  }
  function record(command: AdapterCommand, status: SubmissionState, detail: string) {
    const next = Object.freeze({ command, state: status, detail });
    publish({
      notice: detail,
      commands: Object.freeze(
        state.commands.some((item) => item.command.commandId === command.commandId)
          ? state.commands.map((item) =>
              item.command.commandId === command.commandId ? next : item,
            )
          : [...state.commands, next],
      ),
    });
    return next;
  }
  function observe() {
    if (state.connection.state === 'connected' && state.connection.freshness === 'current')
      publish({ runtime: runtime.getSnapshot(), connection: connection('connected', 'current') });
  }
  function event(body: Pick<Event, 'type' | 'payload'>) {
    const snapshot = runtime.getSnapshot();
    const next = {
      ...body,
      schemaVersion: 2,
      eventId: `${scope.streamId}-event-${snapshot.lastSequence + 1}`,
      streamId: scope.streamId,
      sequence: snapshot.lastSequence + 1,
      threadId: scope.threadId,
      runId: scope.runId,
      attemptId: scope.attemptId,
      occurredAt: '2026-10-05T12:00:00.000Z',
    } as Event;
    if (runtime.ingest(next) !== 'applied') throw new Error('Simulated server event rejected.');
    lastEvent = next;
    observe();
  }
  function run(lifecycle: RuntimeSnapshot['run']['lifecycle']) {
    event({
      type: 'run.updated',
      payload: { lifecycle, version: runtime.getSnapshot().run.version + 1 },
    });
  }
  function available() {
    return (
      state.connection.state === 'connected' &&
      state.connection.freshness === 'current' &&
      !state.commands.some(unresolved) &&
      !state.commands.some(
        (item) => item.state === 'acknowledged' && !applied.has(item.command.commandId),
      )
    );
  }
  function submit(original: AdapterCommand): AdapterCommandRecord {
    const existing = state.commands.find((item) => item.command.commandId === original.commandId);
    if (existing) {
      if (exactCommand(existing.command) !== exactCommand(original))
        throw new Error('Original command identity changed.');
      return existing;
    }
    if (!available())
      throw new Error('Reconcile the original request and refresh current server data first.');
    if (state.commands.length >= 16)
      throw new Error('Simulation request limit reached. Reload to start a fresh demonstration.');
    if (
      JSON.stringify(original.scope) !== JSON.stringify(scope) ||
      original.expectedRunVersion !== runtime.getSnapshot().run.version
    )
      throw new Error('Request scope or run version is stale.');
    if (!['send', 'stop', 'retry', 'continue'].includes(original.operation))
      throw new Error('Unsupported simulation operation.');
    const active = ['running', 'queued'].includes(runtime.getSnapshot().run.lifecycle);
    if ((original.operation === 'stop') !== active)
      throw new Error('Operation is unavailable in this run state.');
    if (!original.commandId.trim() || original.commandId.length > 160)
      throw new Error('Invalid command identity.');
    const payload = original.payload;
    if (
      !payload ||
      Array.isArray(payload) ||
      typeof payload !== 'object' ||
      Object.keys(payload).length !== 1 ||
      !('text' in payload) ||
      typeof payload.text !== 'string' ||
      payload.text.length > 20_000
    )
      throw new Error('Expected a bounded text request.');
    const command = Object.freeze({
      ...original,
      scope: Object.freeze({ ...original.scope }),
      payload: Object.freeze({ text: payload.text }),
    });
    const receipt: AdapterReceipt = Object.freeze({
      command,
      outcome: state.scenario === 'rejected' ? 'rejected' : 'accepted',
      detail:
        state.scenario === 'rejected'
          ? 'Simulated server rejected this request. Draft and partial output retained.'
          : 'Request received; execution has not been reported.',
    });
    receipts.set(command.commandId, receipt);
    acknowledgementModes.set(command.commandId, state.scenario);
    publish({ dispatches: state.dispatches + 1, error: undefined });
    return record(command, 'submitting', 'Awaiting the simulated server acknowledgement.');
  }
  function request(operation: 'send' | 'stop' | 'retry' | 'continue') {
    const text =
      operation === 'send'
        ? state.draft.trim()
        : operation === 'stop'
          ? ''
          : operation === 'continue'
            ? 'Continue the checklist from the retained partial response.'
            : 'Retry the rollout checklist in a new attempt.';
    if (operation !== 'stop' && !text) return;
    const lifecycle = runtime.getSnapshot().run.lifecycle;
    if (operation === 'stop' && !['running', 'queued'].includes(lifecycle)) return;
    if (operation !== 'stop' && ['running', 'queued'].includes(lifecycle)) return;
    try {
      submit({
        commandId: `recovery-command-${++commandNumber}`,
        scope,
        expectedRunVersion: runtime.getSnapshot().run.version,
        operation,
        payload: { text },
      });
    } catch (error) {
      publish({ error: error instanceof Error ? error.message : 'Simulated request unavailable.' });
    }
  }
  function settleAcknowledgement() {
    const pending = state.commands.find((item) => item.state === 'submitting');
    if (!pending) return;
    const receipt = receipts.get(pending.command.commandId)!;
    if (acknowledgementModes.get(pending.command.commandId) === 'lost') {
      record(
        pending.command,
        'outcome-unknown',
        'Acknowledgement lost. Check the exact original receipt before any new request.',
      );
    } else
      record(
        pending.command,
        receipt.outcome === 'accepted' ? 'acknowledged' : 'failed',
        receipt.detail!,
      );
  }
  function lookup(original: AdapterCommand): AdapterCommandRecord {
    const retained = state.commands.find((item) => item.command.commandId === original.commandId);
    if (!retained || exactCommand(retained.command) !== exactCommand(original))
      throw new Error('Lookup requires the exact original command.');
    if (state.connection.state !== 'connected' || state.connection.freshness !== 'current')
      throw new Error('Refresh the server snapshot before looking up this receipt.');
    publish({ lookups: state.lookups + 1 });
    if (state.lookupUnavailable)
      return record(
        retained.command,
        'outcome-unknown',
        'Original receipt is unavailable. No resend or resume is authorized by this observation.',
      );
    const receipt = receipts.get(original.commandId);
    if (!receipt || receipt.outcome === 'unknown' || receipt.outcome === 'not-found')
      return record(
        retained.command,
        'outcome-unknown',
        'Original outcome remains unknown. The request was not resent.',
      );
    return record(
      retained.command,
      receipt.outcome === 'accepted' ? 'acknowledged' : 'failed',
      receipt.detail!,
    );
  }
  function applyReceived() {
    const pending = state.commands.find(
      (item) => item.state === 'acknowledged' && !applied.has(item.command.commandId),
    );
    if (!pending) return;
    const { command } = pending;
    const snapshot = runtime.getSnapshot();
    applied.add(command.commandId);
    if (
      command.scope.streamId !== scope.streamId ||
      command.expectedRunVersion !== snapshot.run.version
    ) {
      record(
        command,
        'acknowledged',
        'Request was received, but its run version changed. No execution applied.',
      );
      publish({
        notice:
          'The response completed before the stop request took effect. Received is not executed.',
      });
      return;
    }
    if (command.operation === 'stop') {
      run('cancelled');
      record(
        command,
        'acknowledged',
        'Server reports this attempt stopped. Partial output retained.',
      );
      publish({
        notice:
          'Attempt stopped by the simulated server. Retry or continuation starts a new attempt.',
      });
      return;
    }
    if (attempt >= 8) {
      record(
        command,
        'acknowledged',
        'Request received, but the simulation attempt limit prevents execution.',
      );
      publish({
        error: 'Simulation attempt limit reached. Reload to start a fresh demonstration.',
      });
      return;
    }
    scope = scopeFor(++attempt);
    chunk = 0;
    const text = (command.payload as { text: string }).text;
    runtime.replaceSnapshot({
      ...snapshot,
      streamId: scope.streamId,
      lastSequence: 0,
      run: {
        id: scope.runId,
        attemptId: scope.attemptId,
        threadId: scope.threadId,
        version: 0,
        lifecycle: 'queued',
      },
      messages: [
        ...snapshot.messages,
        { id: `request-${attempt}`, role: 'user', state: 'complete', revision: 0, text },
      ],
    });
    run('running');
    event({
      type: 'message.created',
      payload: {
        id: `response-${attempt}`,
        role: 'assistant',
        state: 'streaming',
        revision: 0,
        text: '',
      },
    });
    record(
      command,
      'acknowledged',
      'Server reports a new attempt started. The previous output and draft remain available.',
    );
    publish({
      notice: `New attempt ${attempt} started. This is not a durable resume of the previous stream.`,
    });
  }
  function advance() {
    if (runtime.getSnapshot().run.lifecycle !== 'running') return;
    const message = runtime
      .getSnapshot()
      .messages.find((item) => item.id === `response-${attempt}`)!;
    const text = responseChunks[chunk++];
    if (text)
      event({
        type: 'message.delta',
        payload: { id: message.id, offset: messageText(message).length, text },
      });
    else {
      event({ type: 'message.completed', payload: { id: message.id } });
      run('succeeded');
      publish({ notice: 'Simulated server reports the response complete.' });
    }
  }
  function disconnect() {
    publish({
      connection: connection('disconnected', 'stale'),
      refresh: 'idle',
      refreshId: state.refreshId + 1,
      notice:
        'Disconnected. Partial output, request identity, draft and reading position are retained.',
    });
  }
  function refresh() {
    const id = state.refreshId + 1;
    publish({
      refreshId: id,
      refresh: 'submitting',
      connection: connection('reconnecting', 'stale'),
      error: undefined,
      notice: 'Waiting for an explicit simulated server snapshot. No command is resent.',
    });
    return id;
  }
  function settleRefresh(id: number, fail = false): 'ready' | 'failed' | 'obsolete' {
    if (id !== state.refreshId || state.refresh !== 'submitting') return 'obsolete';
    if (fail) {
      publish({
        refresh: 'failed',
        connection: connection('disconnected', 'stale'),
        error: 'Simulated snapshot refresh failed. Retry the refresh; your data is retained.',
      });
      return 'failed';
    }
    publish({
      runtime: runtime.getSnapshot(),
      connection: connection('connected', 'current'),
      refresh: 'idle',
      error: undefined,
      notice:
        'Current simulated snapshot received. Unknown original requests still need receipt lookup; no stream resume is claimed.',
    });
    return 'ready';
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    available,
    submit,
    request,
    lookup,
    applyReceived,
    settleAcknowledgement,
    advance,
    disconnect,
    refresh,
    settleRefresh,
    setDraft(draft: string) {
      publish({ draft: draft.slice(0, 20_000) });
    },
    setScenario(scenario: RecoveryState['scenario']) {
      publish({ scenario });
    },
    setLookupUnavailable(lookupUnavailable: boolean) {
      publish({ lookupUnavailable });
    },
    failResponse() {
      if (runtime.getSnapshot().run.lifecycle !== 'running') return;
      event({
        type: 'message.failed',
        payload: {
          id: `response-${attempt}`,
          error: {
            code: 'SIMULATED_FAILURE',
            message: 'Simulated response failure. Received content retained.',
          },
        },
      });
      run('failed');
      publish({
        notice:
          'Response failed. A retry creates a new attempt after any original request is reconciled.',
      });
    },
    finishBeforeStop() {
      while (runtime.getSnapshot().run.lifecycle === 'running') advance();
    },
    replayLast() {
      if (!lastEvent) return undefined;
      const result = runtime.ingest(lastEvent);
      observe();
      publish({
        notice: `Replayed last canonical event: ${result}. Existing text is retained once.`,
      });
      return result;
    },
    dispose() {
      runtime.dispose();
      listeners.clear();
    },
  };
}

export type RecoveryHost = ReturnType<typeof createRecoveryHost>;
