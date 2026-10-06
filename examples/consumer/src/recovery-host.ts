import { createRuntime } from '@stackunseen/ui-core';
import type { Event, MessageData, RuntimeSnapshot } from '@stackunseen/ui-core';
import type {
  AdapterCommand,
  AdapterJson,
  AdapterObserver,
  AdapterPort,
  AdapterReceipt,
  AdapterScope,
} from '@stackunseen/ui-core/adapter';
import type { ConversationHistory, HistoryPageRequest } from '@stackunseen/ui-core/history';

const pageSize = 4;
const historyLimit = 8;
const scopeKey = (scope: AdapterScope) =>
  JSON.stringify([
    scope.workspaceId,
    scope.branchId,
    scope.threadId,
    scope.runId,
    scope.attemptId,
    scope.streamId,
    scope.schemaVersion,
  ]);
const historyKey = (context: ConversationHistory['context']) =>
  JSON.stringify([
    context.workspaceId,
    context.branchId,
    context.threadId,
    context.snapshotId,
    context.version,
  ]);
const commandKey = (command: AdapterCommand) =>
  JSON.stringify([
    command.commandId,
    scopeKey(command.scope),
    command.expectedRunVersion,
    command.operation,
    command.payload,
  ]);
function freezePayload(value: AdapterJson): AdapterJson {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezePayload);
    Object.freeze(value);
  }
  return value;
}

export interface LocalRecoveryHost {
  readonly scope: AdapterScope;
  readonly initialSnapshot: RuntimeSnapshot;
  readonly port: AdapterPort;
  getSnapshot(): RuntimeSnapshot;
  diagnostics(): { activeChannels: number; closedChannels: number; dispatches: number };
  interrupt(): void;
  loseNextAcknowledgement(): void;
  canAdvance(commandId: string): boolean;
  advance(commandId: string): void;
  dispose(): void;
}

/** Fixed in-memory simulation. No network, persistence, auth service or provider call. */
export function createLocalRecoveryHost(): LocalRecoveryHost {
  const scope: AdapterScope = Object.freeze({
    workspaceId: 'local-recovery-workspace',
    branchId: 'main',
    threadId: 'local-recovery-thread',
    runId: 'local-recovery-run',
    attemptId: 'local-recovery-attempt',
    streamId: 'local-recovery-stream',
    schemaVersion: 1,
  });
  const initialSnapshot: RuntimeSnapshot = {
    schemaVersion: scope.schemaVersion,
    streamId: scope.streamId,
    lastSequence: 0,
    run: {
      id: scope.runId,
      threadId: scope.threadId,
      attemptId: scope.attemptId,
      version: 0,
      lifecycle: 'queued',
      activity: 'Waiting for a fixed local request',
    },
    messages: Array.from({ length: 12 }, (_, index): MessageData => ({
      id: `local-history-${index}`,
      role: index % 2 ? 'assistant' : 'user',
      state: 'complete',
      revision: 0,
      text:
        index % 2
          ? `Sample response ${index + 1}. Keep contextual actions close to the content they affect.`
          : `Sample request ${index + 1}. Inspect spacing and action placement.`,
    })),
    steps: [],
    tools: [],
    sources: [],
    artifacts: [],
    approval: null,
    connection: 'connected',
    stale: false,
    diagnostic: null,
  };
  const runtime = createRuntime(initialSnapshot);
  const channels = new Map<AdapterObserver, () => void>();
  const receipts = new Map<string, AdapterReceipt>();
  const histories = new Map<
    string,
    { context: ConversationHistory['context']; messages: readonly MessageData[] }
  >();
  let disposed = false;
  let droppedAcknowledgement = false;
  let closedChannels = 0;
  let dispatches = 0;
  let appliedCommand: string | undefined;

  function active() {
    if (disposed) throw new Error('Local recovery host is disposed.');
  }
  function exactScope(value: AdapterScope) {
    if (scopeKey(value) !== scopeKey(scope)) throw new Error('Local host scope changed.');
  }
  function windowAt(
    record: { context: ConversationHistory['context']; messages: readonly MessageData[] },
    startIndex: number,
  ): ConversationHistory {
    const end = Math.min(record.messages.length, startIndex + pageSize);
    return Object.freeze({
      context: record.context,
      messages: Object.freeze(record.messages.slice(startIndex, end)),
      startIndex,
      totalMessages: record.messages.length,
      older: Object.freeze(
        startIndex === 0
          ? { state: 'end' as const }
          : { state: 'available' as const, cursor: String(Math.max(0, startIndex - pageSize)) },
      ),
      newer: Object.freeze(
        end === record.messages.length
          ? { state: 'end' as const }
          : { state: 'available' as const, cursor: String(startIndex + pageSize) },
      ),
    });
  }
  function checkpointHistory(snapshot: RuntimeSnapshot) {
    const context = Object.freeze({
      workspaceId: scope.workspaceId,
      branchId: scope.branchId,
      threadId: scope.threadId,
      snapshotId: 'local-recovery-history',
      version: String(snapshot.lastSequence),
    });
    const record = { context, messages: snapshot.messages };
    histories.set(historyKey(context), record);
    while (histories.size > historyLimit) histories.delete(histories.keys().next().value!);
    return windowAt(record, Math.max(0, record.messages.length - pageSize));
  }
  function emit(event: Event) {
    if (runtime.ingest(event) !== 'applied') throw new Error('Local host event was rejected.');
    for (const observer of [...channels.keys()]) {
      if (channels.has(observer)) observer.event(event);
    }
  }
  function interrupt() {
    for (const [observer, close] of [...channels]) {
      if (channels.has(observer)) observer.disconnected();
      close();
    }
  }
  function canAdvance(commandId: string) {
    const receipt = receipts.get(commandId);
    return !disposed && !appliedCommand && receipt?.outcome === 'accepted';
  }
  const port = Object.freeze<AdapterPort>({
    name: 'Local in-memory recovery host',
    version: '1',
    async open(requestScope, observer) {
      active();
      exactScope(requestScope);
      channels.get(observer)?.();
      // Capture and subscribe without an await: no event can fall between them.
      const snapshot = runtime.getSnapshot();
      const history = checkpointHistory(snapshot);
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        channels.delete(observer);
        closedChannels++;
      };
      channels.set(observer, close);
      return { checkpoint: Object.freeze({ scope, snapshot, history }), close };
    },
    async dispatch(input) {
      active();
      exactScope(input.scope);
      dispatches++;
      const existing = receipts.get(input.commandId);
      if (existing) {
        if (commandKey(existing.command) !== commandKey(input))
          throw new Error('Command ID was reused with different content.');
        return existing;
      }
      const command = Object.freeze({
        ...input,
        scope,
        payload: freezePayload(structuredClone(input.payload)),
      });
      const payload = command.payload;
      const accepted =
        receipts.size === 0 &&
        runtime.getSnapshot().run.lifecycle === 'queued' &&
        command.expectedRunVersion === runtime.getSnapshot().run.version &&
        command.operation === 'request-local-review' &&
        !!payload &&
        !Array.isArray(payload) &&
        typeof payload === 'object' &&
        Object.keys(payload).length === 1 &&
        'subject' in payload &&
        payload.subject === 'Component spacing';
      const receipt: AdapterReceipt = Object.freeze({
        command,
        outcome: accepted ? 'accepted' : 'rejected',
        detail: accepted
          ? 'Original request received. The fixed local action has not been applied.'
          : 'Only one current fixed local review request is supported in this simulation.',
      });
      if (receipts.size >= 8) throw new Error('Local receipt bound reached.');
      receipts.set(command.commandId, receipt);
      if (droppedAcknowledgement) {
        droppedAcknowledgement = false;
        throw new Error('Simulated lost acknowledgement; the original receipt is retained.');
      }
      return receipt;
    },
    async lookup(original) {
      active();
      exactScope(original.scope);
      const receipt = receipts.get(original.commandId);
      if (!receipt)
        return {
          command: original,
          outcome: 'not-found',
          detail: 'No original receipt is stored.',
        };
      if (commandKey(receipt.command) !== commandKey(original))
        throw new Error('Lookup must use the exact original command.');
      return receipt;
    },
    async readHistory(request: HistoryPageRequest) {
      active();
      const record = histories.get(historyKey(request.context));
      if (!record) throw new Error('History checkpoint is not retained.');
      const startIndex = Number(request.cursor);
      if (
        !/^(0|[1-9]\d*)$/.test(request.cursor) ||
        !Number.isSafeInteger(startIndex) ||
        startIndex < 0 ||
        startIndex >= record.messages.length ||
        !['older', 'newer'].includes(request.direction)
      )
        throw new Error('History page cursor is invalid.');
      return windowAt(record, startIndex);
    },
  });
  return {
    scope,
    initialSnapshot: runtime.getSnapshot(),
    port,
    getSnapshot: runtime.getSnapshot,
    diagnostics: () => ({ activeChannels: channels.size, closedChannels, dispatches }),
    interrupt,
    loseNextAcknowledgement() {
      active();
      droppedAcknowledgement = true;
    },
    canAdvance,
    advance(commandId) {
      active();
      if (!canAdvance(commandId))
        throw new Error('An unapplied accepted original request is required.');
      appliedCommand = commandId;
      const before = runtime.getSnapshot();
      const envelope = {
        schemaVersion: scope.schemaVersion,
        streamId: scope.streamId,
        threadId: scope.threadId,
        runId: scope.runId,
        attemptId: scope.attemptId,
        occurredAt: '2026-09-30T12:00:00Z',
      };
      emit({
        ...envelope,
        type: 'run.updated',
        eventId: 'local-action-started',
        sequence: before.lastSequence + 1,
        payload: { lifecycle: 'running', version: before.run.version + 1 },
      });
      emit({
        ...envelope,
        type: 'message.created',
        eventId: 'local-action-response',
        sequence: before.lastSequence + 2,
        payload: {
          id: 'local-action-response',
          role: 'assistant',
          state: 'complete',
          revision: 0,
          text: 'The local host applied the fixed review request. This sample output comes from a host event; no model or external tool was called.',
        },
      });
      emit({
        ...envelope,
        type: 'run.updated',
        eventId: 'local-action-completed',
        sequence: before.lastSequence + 3,
        payload: {
          lifecycle: 'succeeded',
          version: before.run.version + 2,
          activity: 'Fixed local action applied',
        },
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      interrupt();
      runtime.dispose();
      receipts.clear();
      histories.clear();
    },
  };
}
