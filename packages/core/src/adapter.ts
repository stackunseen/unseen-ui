import { z } from 'zod';
import { createRuntime } from './runtime.js';
import { eventSchema } from './schema.js';
import { inspectConversationHistory } from './history.js';
import type { ConversationHistory, HistoryPageRequest } from './history.js';
import type { ConnectionInfo } from './inspection.js';
import type { RuntimeSnapshot, SubmissionState } from './types.js';

export type AdapterJson =
  | null
  | boolean
  | number
  | string
  | readonly AdapterJson[]
  | {
      readonly [key: string]: AdapterJson;
    };
/** Fixed for this session. A new attempt/stream needs a new session. */
export interface AdapterScope {
  workspaceId: string;
  branchId?: string;
  threadId: string;
  runId: string;
  attemptId: string;
  streamId: string;
  schemaVersion: 1 | 2;
}
export interface AdapterCommand {
  commandId: string;
  scope: AdapterScope;
  expectedRunVersion: number;
  operation: string;
  payload: AdapterJson;
}
export interface AdapterReceipt {
  /** Exact original immutable command, not just its identifier. */
  command: AdapterCommand;
  outcome: 'accepted' | 'rejected' | 'unknown' | 'not-found';
  detail?: string;
}
export interface AdapterCommandRecord {
  command: AdapterCommand;
  state: SubmissionState;
  detail?: string;
}
export interface AdapterCheckpoint {
  scope: AdapterScope;
  snapshot: unknown;
  history?: unknown;
}
export interface AdapterObserver {
  event(value: unknown): void;
  disconnected(): void;
}
export interface AdapterChannel {
  checkpoint: AdapterCheckpoint;
  close(): void;
}
/** No network/storage implementation lives in core. Host implementations authorize commands. */
export interface AdapterPort {
  name: string;
  version: string;
  /** Atomically capture a checkpoint and subscribe strictly after its cursor.
   * Events arriving before open resolves are permitted and bounded by the session.
   * A rejected open must release any channel it allocated. No replay is claimed.
   */
  open?(scope: AdapterScope, observer: AdapterObserver): Promise<AdapterChannel>;
  dispatch?(command: AdapterCommand): Promise<unknown>;
  lookup?(original: AdapterCommand): Promise<unknown>;
  /** Read at this exact immutable history context; returning a newer context is rejected. */
  readHistory?(request: HistoryPageRequest): Promise<unknown>;
}
export interface AdapterState {
  scope: AdapterScope;
  connection: ConnectionInfo;
  opening: boolean;
  runtime: RuntimeSnapshot;
  history?: ConversationHistory;
  historyLoading: boolean;
  historyError?: string;
  commands: readonly AdapterCommandRecord[];
}
export interface AdapterSession {
  getSnapshot(): AdapterState;
  subscribe(listener: () => void): () => void;
  refresh(): Promise<'ready' | 'failed' | 'obsolete'>;
  submit(command: AdapterCommand): Promise<AdapterCommandRecord>;
  reconcile(commandId: string): Promise<AdapterCommandRecord>;
  page(request: HistoryPageRequest): Promise<'applied' | 'failed' | 'obsolete'>;
  dispose(): void;
}
export const adapterLimits = Object.freeze({ commands: 256, bufferedEvents: 100 });
const id = z
  .string()
  .min(1)
  .max(160)
  .refine((v) => !!v.trim() && !/[\p{Cc}\p{Cs}]/u.test(v));
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const scopeSchema = z.strictObject({
  workspaceId: id,
  branchId: id.optional(),
  threadId: id,
  runId: id,
  attemptId: id,
  streamId: id,
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
});
const commandSchema = z.strictObject({
  commandId: id,
  scope: scopeSchema,
  expectedRunVersion: count,
  operation: id,
  payload: z.unknown(),
});
const receiptSchema = z.strictObject({
  command: commandSchema,
  outcome: z.enum(['accepted', 'rejected', 'unknown', 'not-found']),
  detail: z.string().max(1000).optional(),
});
/** Own descriptor copies prevent getters and later host mutation. Proxy reflection is not isolated. */
function copyData(
  input: unknown,
  unitsLimit = 64_000,
  nodesLimit = 2000,
  allowOptional = false,
): unknown {
  let units = 0,
    nodes = 0;
  const ancestors = new WeakSet<object>();
  function visit(value: unknown, depth: number): unknown {
    if (++nodes > nodesLimit || depth > 12) throw new Error('Adapter data exceeds bounds.');
    if (typeof value === 'string') {
      units += value.length;
      if (units > unitsLimit) throw new Error('Adapter text exceeds bounds.');
      return value;
    }
    if (value === null || typeof value === 'boolean') return value;
    if (allowOptional && value === undefined) return undefined;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (!value || typeof value !== 'object' || ancestors.has(value))
      throw new Error('Expected plain adapter data.');
    const array = Array.isArray(value);
    if (!array && ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
      throw new Error('Expected plain adapter data.');
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors).filter((k) => !array || k !== 'length');
    if (keys.length > (array ? 500 : 32) || keys.some((k) => typeof k !== 'string'))
      throw new Error('Adapter collection exceeds bounds.');
    if (
      array &&
      (descriptors.length?.value !== keys.length || keys.some((k, i) => k !== String(i)))
    )
      throw new Error('Sparse adapter data is unsupported.');
    ancestors.add(value);
    const entries = keys.map((key) => {
      const descriptor = descriptors[key as string]!;
      if (!('value' in descriptor)) throw new Error('Adapter accessors are unsupported.');
      units += String(key).length;
      if (units > unitsLimit) throw new Error('Adapter data exceeds bounds.');
      return [key as string, visit(descriptor.value, depth + 1)] as const;
    });
    ancestors.delete(value);
    return Object.freeze(array ? entries.map(([, v]) => v) : Object.fromEntries(entries));
  }
  return visit(input, 0);
}
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
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
const commandKey = (command: AdapterCommand) =>
  JSON.stringify([
    command.commandId,
    scopeKey(command.scope),
    command.expectedRunVersion,
    command.operation,
    canonicalJson(command.payload),
  ]);
function canonicalJson(value: AdapterJson): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map(
      (k) => `${JSON.stringify(k)}:${canonicalJson((value as { [key: string]: AdapterJson })[k]!)}`,
    )
    .join(',')}}`;
}
const contextKey = (context: ConversationHistory['context']) =>
  JSON.stringify([
    context.workspaceId,
    context.threadId,
    context.branchId,
    context.snapshotId,
    context.version,
  ]);
function sameHistoryScope(history: ConversationHistory, scope: AdapterScope) {
  return (
    history.context.workspaceId === scope.workspaceId &&
    history.context.threadId === scope.threadId &&
    history.context.branchId === scope.branchId
  );
}
const canonicalSnapshot = (snapshot: RuntimeSnapshot) =>
  JSON.stringify([
    snapshot.schemaVersion,
    snapshot.streamId,
    snapshot.lastSequence,
    snapshot.run,
    snapshot.messages,
    snapshot.steps,
    snapshot.tools,
    snapshot.approval,
    snapshot.sources,
    snapshot.artifacts,
  ]);

export function createAdapterSession(
  portInput: AdapterPort,
  scopeInput: AdapterScope,
  initial: unknown,
  options: { acknowledgementTimeoutMs?: number } = {},
): AdapterSession {
  const timeoutMs = options.acknowledgementTimeoutMs ?? 10_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000)
    throw new Error('Invalid acknowledgement timeout.');
  const port = Object.freeze({
    name: portInput.name,
    version: portInput.version,
    open: portInput.open?.bind(portInput),
    dispatch: portInput.dispatch?.bind(portInput),
    lookup: portInput.lookup?.bind(portInput),
    readHistory: portInput.readHistory?.bind(portInput),
  });
  const scope = deepFreeze(
    scopeSchema.parse(copyData(scopeInput, 64_000, 2000, true)),
  ) as AdapterScope;
  const name = id.parse(port.name),
    version = id.parse(port.version);
  const runtime = createRuntime(initial);
  function scopeMatches(snapshot: RuntimeSnapshot) {
    return (
      snapshot.streamId === scope.streamId &&
      snapshot.schemaVersion === scope.schemaVersion &&
      snapshot.run.threadId === scope.threadId &&
      snapshot.run.id === scope.runId &&
      snapshot.run.attemptId === scope.attemptId
    );
  }
  if (!scopeMatches(runtime.getSnapshot())) {
    runtime.dispose();
    throw new Error('Initial runtime does not match adapter scope.');
  }
  const listeners = new Set<() => void>();
  const records = new Map<string, AdapterCommandRecord>();
  const lookups = new Map<string, number>();
  const acknowledgements = new Map<
    string,
    { timer: ReturnType<typeof setTimeout>; finish(record: AdapterCommandRecord): void }
  >();
  let generation = 0,
    pageGeneration = 0,
    disposed = false,
    opening = false,
    hostCheckpoint = false;
  let close: (() => void) | undefined, history: ConversationHistory | undefined;
  let historyLoading = false,
    historyError: string | undefined;
  let transport: ConnectionInfo['state'] = 'disconnected';
  let compatibility: ConnectionInfo['recovery'] = 'none';
  let detail: string | undefined;
  let state: AdapterState;
  let adopting = false;
  function publish() {
    if (disposed || adopting) return;
    const snapshot = runtime.getSnapshot();
    state = Object.freeze({
      scope,
      opening,
      runtime: snapshot,
      history,
      historyLoading,
      historyError,
      commands: Object.freeze([...records.values()]),
      connection: deepFreeze({
        state: transport,
        recovery: compatibility,
        freshness: hostCheckpoint ? (snapshot.stale ? 'stale' : 'current') : 'unknown',
        adapter: { name, version, resume: false, snapshot: !!port.open },
        cursor: { streamId: scope.streamId, sequence: snapshot.lastSequence },
        detail: detail ?? snapshot.diagnostic ?? undefined,
      } satisfies ConnectionInfo),
    });
    listeners.forEach((listener) => {
      try {
        listener();
      } catch {
        /* Consumer failures are not host protocol failures. */
      }
    });
  }
  function release() {
    const callback = close;
    close = undefined;
    try {
      callback?.();
    } catch {
      /* Channel is invalidated even when host cleanup fails. */
    }
  }
  function interrupt(incompatible: boolean, message: string) {
    const wasAdopting = adopting;
    adopting = true;
    generation++;
    pageGeneration++;
    opening = false;
    historyLoading = false;
    transport = 'disconnected';
    compatibility = incompatible ? 'incompatible' : 'none';
    detail = message;
    records.forEach((record) => {
      if (record.state === 'submitting')
        store(
          record.command,
          'outcome-unknown',
          'Connection was interrupted before acknowledgement. Check the original command.',
        );
    });
    release();
    runtime.setConnection('disconnected');
    adopting = wasAdopting;
    publish();
  }
  runtime.setConnection('disconnected');
  const unsubscribe = runtime.subscribe(publish);
  publish();
  function store(command: AdapterCommand, submission: SubmissionState, message?: string) {
    const record = Object.freeze({ command, state: submission, detail: message });
    records.set(command.commandId, record);
    publish();
    if (submission !== 'submitting') acknowledgements.get(command.commandId)?.finish(record);
    return record;
  }
  function settle(command: AdapterCommand, input: unknown) {
    const previous = records.get(command.commandId)!;
    if (previous.state === 'acknowledged' || previous.state === 'failed') return previous;
    return receipt(command, input);
  }
  function receipt(original: AdapterCommand, input: unknown) {
    try {
      const parsed = receiptSchema.parse(copyData(input, 64_000, 2000, true)) as AdapterReceipt;
      copyData(parsed.command.payload);
      if (commandKey(parsed.command) !== commandKey(original))
        return store(original, 'outcome-unknown', 'Receipt does not match the original command.');
      const submission =
        parsed.outcome === 'accepted'
          ? 'acknowledged'
          : parsed.outcome === 'rejected'
            ? 'failed'
            : 'outcome-unknown';
      return store(
        original,
        submission,
        parsed.detail ??
          (parsed.outcome === 'not-found'
            ? 'Original receipt was not found. The outcome remains unknown.'
            : undefined),
      );
    } catch {
      return store(
        original,
        'outcome-unknown',
        'Invalid receipt. Reconcile the original command with the host.',
      );
    }
  }
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async refresh() {
      if (disposed) return 'obsolete';
      if (!port.open) {
        detail = 'This host does not provide coherent snapshot recovery.';
        publish();
        return 'failed';
      }
      const current = ++generation;
      pageGeneration++;
      historyLoading = false;
      historyError = undefined;
      release();
      opening = true;
      transport = 'reconnecting';
      compatibility = 'none';
      detail = undefined;
      runtime.setConnection('reconnecting');
      publish();
      const pending: unknown[] = [];
      let ready = false;
      const active = () => !disposed && generation === current;
      const observer: AdapterObserver = {
        event(input) {
          if (!active()) return;
          try {
            const event = eventSchema.parse(copyData(input, 250_000, 4000, true));
            if (!ready) {
              if (pending.length >= adapterLimits.bufferedEvents)
                throw new Error('Pre-checkpoint event buffer exceeded.');
              pending.push(deepFreeze(event));
            } else {
              const outcome = runtime.ingest(event);
              if (outcome === 'rejected')
                throw new Error('Live host event was rejected. Refresh a compatible checkpoint.');
            }
          } catch {
            interrupt(true, 'Host events are incompatible or exceed the recovery bounds.');
          }
        },
        disconnected() {
          if (active())
            interrupt(
              false,
              'Connection lost. Refresh the host checkpoint; pending command outcomes remain unchanged.',
            );
        },
      };
      try {
        const channel = await port.open(scope, observer);
        let closed = false;
        const closeOnce = () => {
          if (!closed) {
            closed = true;
            channel.close();
          }
        };
        if (!active()) {
          closeOnce();
          return 'obsolete';
        }
        close = closeOnce;
        const checkpointScope = scopeSchema.parse(
          copyData(channel.checkpoint.scope, 64_000, 2000, true),
        );
        if (scopeKey(checkpointScope) !== scopeKey(scope))
          throw new Error('Checkpoint scope changed.');
        const verifier = createRuntime(channel.checkpoint.snapshot);
        const checkpoint = verifier.getSnapshot();
        verifier.dispose();
        if (!scopeMatches(checkpoint) || checkpoint.stale || checkpoint.connection !== 'connected')
          throw new Error('Checkpoint is not current for this session.');
        const previous = runtime.getSnapshot();
        if (checkpoint.run.version < previous.run.version)
          throw new Error('Run version regressed.');
        if (
          hostCheckpoint &&
          checkpoint.lastSequence === previous.lastSequence &&
          canonicalSnapshot(checkpoint) !== canonicalSnapshot(previous)
        )
          throw new Error('Checkpoint conflicts at an unchanged cursor.');
        const window =
          channel.checkpoint.history === undefined
            ? undefined
            : inspectConversationHistory(channel.checkpoint.history);
        if (
          channel.checkpoint.history !== undefined &&
          (!window || !sameHistoryScope(window, scope))
        )
          throw new Error('Checkpoint history does not match this session.');
        // Validation completes before adopting either projection or history.
        adopting = true;
        runtime.replaceSnapshot(checkpoint);
        history = window;
        hostCheckpoint = true;
        transport = 'connected';
        opening = false;
        ready = true;
        for (const event of pending) {
          if (!active()) return 'obsolete';
          if (
            (event as { sequence: number }).sequence <= checkpoint.lastSequence ||
            runtime.ingest(event) === 'rejected'
          )
            throw new Error('Checkpoint subscription did not start after its cursor.');
        }
        adopting = false;
        publish();
        return 'ready';
      } catch {
        adopting = false;
        if (!active()) return 'obsolete';
        interrupt(
          true,
          'Coherent host checkpoint could not be established. Existing data may be out of date.',
        );
        return 'failed';
      }
    },
    async submit(input) {
      if (disposed) throw new Error('Adapter session is disposed.');
      const command = deepFreeze(
        commandSchema.parse(copyData(input, 64_000, 2000, true)),
      ) as AdapterCommand;
      copyData(command.payload);
      if (scopeKey(command.scope) !== scopeKey(scope)) throw new Error('Command scope changed.');
      const existing = records.get(command.commandId);
      if (existing) {
        if (commandKey(command) !== commandKey(existing.command))
          throw new Error('Command identifier was reused with different content.');
        return existing;
      }
      if (records.size >= adapterLimits.commands)
        throw new Error(
          'Command retention bound reached. Preserve original receipts before starting another session.',
        );
      if (!port.dispatch) throw new Error('Host command submission is unavailable.');
      const snapshot = runtime.getSnapshot();
      if (
        opening ||
        transport !== 'connected' ||
        snapshot.stale ||
        command.expectedRunVersion !== snapshot.run.version
      )
        throw new Error('Command requires a current matching host version.');
      const pending = store(command, 'submitting');
      return await new Promise<AdapterCommandRecord>((finish) => {
        const complete = (record: AdapterCommandRecord) => {
          const acknowledgement = acknowledgements.get(command.commandId);
          if (acknowledgement) clearTimeout(acknowledgement.timer);
          acknowledgements.delete(command.commandId);
          finish(record);
        };
        const timer = setTimeout(() => {
          const previous = records.get(command.commandId)!;
          complete(
            disposed || previous.state !== 'submitting'
              ? previous
              : store(
                  command,
                  'outcome-unknown',
                  'Acknowledgement timed out. Check the original command; do not resend it.',
                ),
          );
        }, timeoutMs);
        acknowledgements.set(command.commandId, { timer, finish: complete });
        // Late exact receipts may settle an unknown record, even after a transport refresh.
        Promise.resolve()
          .then(() => {
            if (disposed) throw new Error('Adapter session was disposed before dispatch.');
            return port.dispatch!(command);
          })
          .then(
            (result) => complete(disposed ? pending : settle(command, result)),
            () => {
              const previous = records.get(command.commandId)!;
              complete(
                disposed || previous.state !== 'submitting'
                  ? previous
                  : store(
                      command,
                      'outcome-unknown',
                      'Acknowledgement was not received. Check the original command; do not resend it.',
                    ),
              );
            },
          );
      });
    },
    async reconcile(commandId) {
      const record = records.get(commandId);
      if (!record || disposed) throw new Error('Original command is unavailable in this session.');
      if (record.state !== 'outcome-unknown') return record;
      if (!port.lookup) return record;
      const token = (lookups.get(commandId) ?? 0) + 1;
      lookups.set(commandId, token);
      try {
        const result = await port.lookup(record.command);
        if (
          disposed ||
          lookups.get(commandId) !== token ||
          records.get(commandId)?.state !== 'outcome-unknown'
        )
          return records.get(commandId) ?? record;
        return settle(record.command, result);
      } catch {
        return records.get(commandId) ?? record;
      }
    },
    async page(input) {
      if (
        disposed ||
        !port.readHistory ||
        !history ||
        historyLoading ||
        transport !== 'connected' ||
        runtime.getSnapshot().stale
      )
        return 'failed';
      let request: HistoryPageRequest;
      try {
        request = z
          .strictObject({ context: z.unknown(), direction: z.enum(['older', 'newer']), cursor: id })
          .parse(copyData(input, 64_000, 2000, true)) as HistoryPageRequest;
        if (contextKey(request.context) !== contextKey(history.context)) return 'obsolete';
        const edge = history[request.direction];
        if (
          (edge.state !== 'available' && edge.state !== 'error') ||
          edge.cursor !== request.cursor
        )
          return 'failed';
        request = deepFreeze({ ...request, context: history.context });
      } catch {
        return 'failed';
      }
      const current = generation,
        token = ++pageGeneration,
        original = contextKey(history.context);
      historyLoading = true;
      historyError = undefined;
      publish();
      try {
        const response = await port.readHistory(request);
        if (
          disposed ||
          generation !== current ||
          pageGeneration !== token ||
          !history ||
          contextKey(history.context) !== original
        )
          return 'obsolete';
        const next = inspectConversationHistory(response);
        if (!next || !sameHistoryScope(next, scope) || contextKey(next.context) !== original)
          throw new Error('History response changed context.');
        history = next;
        historyLoading = false;
        publish();
        return 'applied';
      } catch {
        if (disposed || generation !== current || pageGeneration !== token) return 'obsolete';
        historyLoading = false;
        historyError = 'History page could not be read at its original context.';
        publish();
        return 'failed';
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      generation++;
      pageGeneration++;
      release();
      unsubscribe();
      runtime.dispose();
      listeners.clear();
      acknowledgements.forEach((acknowledgement, commandId) => {
        const original = records.get(commandId)!;
        acknowledgement.finish(
          original.state === 'submitting'
            ? Object.freeze({ ...original, state: 'outcome-unknown' })
            : original,
        );
      });
    },
  };
}
