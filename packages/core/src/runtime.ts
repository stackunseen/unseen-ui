import { eventSchema, snapshotSchema } from './schema.js';
import type { Event, RunLifecycle, Runtime, RuntimeSnapshot, ToolState } from './types.js';
import { interruptMessage, messageTextLength, nextMessageRevision } from './messages.js';

const transitions: Record<RunLifecycle, readonly RunLifecycle[]> = {
  queued: ['running', 'cancelled', 'failed'],
  running: ['waiting-input', 'waiting-approval', 'paused', 'succeeded', 'failed', 'cancelled'],
  'waiting-input': ['running', 'failed', 'cancelled'],
  'waiting-approval': ['running', 'failed', 'cancelled'],
  paused: ['running', 'failed', 'cancelled'],
  succeeded: [],
  failed: [],
  cancelled: [],
};
const toolTransitions: Record<ToolState, readonly ToolState[]> = {
  queued: ['input-streaming', 'approval-required', 'running', 'cancelled', 'failed'],
  'input-streaming': ['approval-required', 'running', 'cancelled', 'failed'],
  'approval-required': ['running', 'denied', 'cancelled', 'failed'],
  running: ['succeeded', 'failed', 'cancelled', 'outcome-unknown'],
  'outcome-unknown': ['succeeded', 'failed', 'cancelled'],
  succeeded: [],
  failed: [],
  denied: [],
  cancelled: [],
};
export function canTransition(from: RunLifecycle, to: RunLifecycle): boolean {
  return transitions[from].includes(to);
}
function upsert<T extends { id: string }>(items: T[], item: T, limit: number): T[] {
  const found = items.some((x) => x.id === item.id);
  if (!found && items.length >= limit)
    throw new Error('Collection limit reached; request a paginated snapshot.');
  return found ? items.map((x) => (x.id === item.id ? item : x)) : [...items, item];
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}
// Conservative descriptor/value bounds derived from the schema's collection maxima.
// Copy own data properties so schema parsing cannot read getters on the host input.
// Reflection can still execute arbitrary Proxy traps; it is not a sandbox.
const maxRuntimeDataValues =
  500 * (16 + 100 * 8) + 200 * (16 + 50) + 400 * 16 + 100 * (16 + 100) + 100;
function plainRuntimeData(input: unknown): unknown {
  let values = 0;
  const ancestors = new WeakSet<object>();
  function invalid(): never {
    throw new Error('Expected bounded plain runtime data.');
  }
  function copy(value: unknown, depth: number): unknown {
    if (++values > maxRuntimeDataValues || depth > 6) return invalid();
    if (typeof value === 'string') return value.length <= 100_000 ? value : invalid();
    if (value === null || value === undefined || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : invalid();
    if (typeof value !== 'object' || ancestors.has(value)) return invalid();
    const array = Array.isArray(value);
    if (!array && ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
      return invalid();
    const length = array ? Object.getOwnPropertyDescriptor(value, 'length')?.value : 0;
    if (array && (!Number.isSafeInteger(length) || length < 0 || length > 500)) return invalid();
    const keys = Reflect.ownKeys(value).filter((key) => !array || key !== 'length');
    if (
      keys.length > (array ? length : 16) ||
      keys.some((key) => typeof key !== 'string') ||
      (array && (keys.length !== length || keys.some((key, index) => key !== String(index))))
    )
      return invalid();
    const result: unknown[] | Record<string, unknown> = array ? [] : Object.create(null);
    ancestors.add(value);
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !('value' in descriptor)) return invalid();
      const child = copy(descriptor.value, depth + 1);
      if (array) (result as unknown[]).push(child);
      else (result as Record<string, unknown>)[key as string] = child;
    }
    ancestors.delete(value);
    return result;
  }
  try {
    return copy(input, 0);
  } catch {
    return invalid();
  }
}
function checkedSnapshot(value: unknown): RuntimeSnapshot {
  const snapshot = snapshotSchema.parse(plainRuntimeData(value));
  for (const collection of [
    snapshot.messages,
    snapshot.steps,
    snapshot.tools,
    snapshot.sources,
    snapshot.artifacts,
  ]) {
    if (new Set(collection.map((item) => item.id)).size !== collection.length)
      throw new Error('Duplicate entity identity in snapshot.');
  }
  if (
    snapshot.approval &&
    (snapshot.approval.runId !== snapshot.run.id ||
      !snapshot.tools.some((t) => t.id === snapshot.approval?.toolCallId))
  )
    throw new Error('Approval refers to an unavailable run or tool.');
  return snapshot;
}
function project(s: RuntimeSnapshot, e: Event): RuntimeSnapshot {
  switch (e.type) {
    case 'run.updated': {
      const terminal = transitions[s.run.lifecycle].length === 0;
      if (
        terminal ||
        e.payload.version !== s.run.version + 1 ||
        (e.payload.lifecycle !== s.run.lifecycle &&
          !canTransition(s.run.lifecycle, e.payload.lifecycle))
      )
        throw new Error('Invalid run transition or version.');
      const terminalNext = transitions[e.payload.lifecycle].length === 0;
      return {
        ...s,
        run: { ...s.run, ...e.payload },
        messages: terminalNext
          ? s.messages.map((m) => (m.state === 'streaming' ? interruptMessage(m) : m))
          : s.messages,
      };
    }
    case 'message.created':
      if (s.messages.some((m) => m.id === e.payload.id)) throw new Error('Message already exists.');
      return { ...s, messages: upsert(s.messages, e.payload, 500) };
    case 'message.delta': {
      if (s.run.lifecycle !== 'running') throw new Error('Text arrived outside an active run.');
      const m = s.messages.find((x) => x.id === e.payload.id);
      if (
        !m ||
        m.parts ||
        m.state !== 'streaming' ||
        m.text.length !== e.payload.offset ||
        m.text.length + e.payload.text.length > 100_000
      )
        throw new Error('Invalid text offset, state or size.');
      return {
        ...s,
        messages: upsert(
          s.messages,
          { ...m, text: m.text + e.payload.text, revision: nextMessageRevision(m.revision) },
          500,
        ),
      };
    }
    case 'message.completed': {
      const m = s.messages.find((x) => x.id === e.payload.id);
      if (
        !m ||
        m.state !== 'streaming' ||
        m.parts?.some((part) => part.type === 'text' && part.state !== 'complete')
      )
        throw new Error('Cannot complete an unavailable message or unfinished part.');
      return {
        ...s,
        messages: upsert(
          s.messages,
          { ...m, state: 'complete', revision: nextMessageRevision(m.revision) },
          500,
        ),
      };
    }
    case 'message.part.added':
    case 'message.part.delta':
    case 'message.part.completed': {
      const message = s.messages.find((item) => item.id === e.payload.id);
      if (s.run.lifecycle !== 'running' || !message?.parts || message.state !== 'streaming')
        throw new Error('Parts require an active structured message.');
      let parts = message.parts;
      const last = parts.at(-1);
      if (e.type === 'message.part.added') {
        if (
          parts.length >= 100 ||
          parts.some((part) => part.id === e.payload.part.id) ||
          (last?.type === 'text' && last.state === 'streaming') ||
          (e.payload.part.type === 'text' && e.payload.part.state === 'interrupted')
        )
          throw new Error('Invalid part identity, order, state or count.');
        parts = [...parts, e.payload.part];
      } else {
        if (last?.id !== e.payload.partId || last.type !== 'text' || last.state !== 'streaming')
          throw new Error('Only the current text part can change.');
        if (e.type === 'message.part.delta') {
          if (last.text.length !== e.payload.offset) throw new Error('Invalid part text offset.');
          parts = [...parts.slice(0, -1), { ...last, text: last.text + e.payload.text }];
        } else parts = [...parts.slice(0, -1), { ...last, state: 'complete' }];
      }
      if (messageTextLength(parts) > 100_000) throw new Error('Message text limit exceeded.');
      return {
        ...s,
        messages: upsert(
          s.messages,
          { ...message, parts, revision: nextMessageRevision(message.revision) },
          500,
        ),
      };
    }
    case 'message.failed': {
      const message = s.messages.find((item) => item.id === e.payload.id);
      if (!message || message.state !== 'streaming')
        throw new Error('Cannot fail an unavailable message.');
      return {
        ...s,
        messages: upsert(
          s.messages,
          { ...interruptMessage(message, 'failed'), error: e.payload.error },
          500,
        ),
      };
    }
    case 'step.updated':
      return { ...s, steps: upsert(s.steps, e.payload, 200) };
    case 'tool.updated': {
      const old = s.tools.find((t) => t.id === e.payload.id);
      if (
        old &&
        (e.payload.revision !== old.revision + 1 ||
          (!toolTransitions[old.state].includes(e.payload.state) &&
            !(
              e.payload.state === old.state &&
              ['queued', 'input-streaming', 'running'].includes(old.state)
            )))
      )
        throw new Error('Invalid tool transition or revision.');
      return { ...s, tools: upsert(s.tools, e.payload, 200) };
    }
    case 'approval.requested':
      if (
        e.payload.runId !== s.run.id ||
        !s.tools.some((tool) => tool.id === e.payload.toolCallId) ||
        e.payload.status !== 'pending' ||
        (s.approval?.id === e.payload.id && e.payload.version <= s.approval.version)
      )
        throw new Error('Invalid approval proposal.');
      return { ...s, approval: e.payload };
    case 'approval.resolved':
      if (
        !s.approval ||
        s.approval.status !== 'pending' ||
        s.approval.id !== e.payload.id ||
        s.approval.version !== e.payload.version
      )
        throw new Error('Approval resolution does not match the current proposal.');
      return { ...s, approval: { ...s.approval, status: e.payload.status } };
    case 'source.updated':
      return { ...s, sources: upsert(s.sources, e.payload, 200) };
    case 'artifact.created': {
      const old = s.artifacts.find((a) => a.id === e.payload.id);
      if (old && e.payload.version <= old.version)
        throw new Error('Artifact versions are immutable.');
      return { ...s, artifacts: upsert(s.artifacts, e.payload, 100) };
    }
  }
}

/** Headless projection only: the host owns replay, persistence and command execution. */
export function createRuntime(
  initial: unknown,
  options: { maxBuffered?: number; maxReplay?: number; gapTimeoutMs?: number } = {},
): Runtime {
  let snapshot = freeze(checkedSnapshot(initial));
  const serverSnapshot = snapshot;
  const listeners = new Set<() => void>();
  const seen = new Map<string, string>();
  const pending = new Map<number, Event>();
  const maxBuffered = options.maxBuffered ?? 100;
  const maxReplay = options.maxReplay ?? 2000;
  const gapTimeoutMs = options.gapTimeoutMs ?? 2000;
  if (![maxBuffered, maxReplay, gapTimeoutMs].every((n) => Number.isSafeInteger(n) && n > 0))
    throw new Error('Runtime limits must be positive integers.');
  let gapTimer: ReturnType<typeof setTimeout> | undefined;
  let fatal = false;
  let disposed = false;
  function notify() {
    snapshot = freeze(snapshot);
    for (const listener of listeners) listener();
  }
  function reject(message: string): 'rejected' {
    fatal = true;
    clearTimeout(gapTimer);
    pending.clear();
    snapshot = { ...snapshot, stale: true, diagnostic: message };
    notify();
    return 'rejected';
  }
  function apply(event: Event) {
    snapshot = { ...project(snapshot, event), lastSequence: event.sequence };
    seen.set(event.eventId, JSON.stringify(event));
  }
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    ingest(input) {
      if (disposed || fatal) return 'rejected';
      let parsed: ReturnType<typeof eventSchema.safeParse>;
      try {
        parsed = eventSchema.safeParse(plainRuntimeData(input));
      } catch {
        return reject('Unsupported or invalid event. Refresh the host snapshot.');
      }
      if (!parsed.success)
        return reject('Unsupported or invalid event. Refresh the host snapshot.');
      const e = parsed.data;
      if (
        e.streamId !== snapshot.streamId ||
        e.runId !== snapshot.run.id ||
        e.attemptId !== snapshot.run.attemptId ||
        e.threadId !== snapshot.run.threadId
      )
        return 'rejected';
      if (e.schemaVersion !== snapshot.schemaVersion)
        return reject('Protocol version changed. Refresh with a compatible host snapshot.');
      const fingerprint = JSON.stringify(e);
      const prior =
        seen.get(e.eventId) ?? [...pending.values()].find((x) => x.eventId === e.eventId);
      if (prior)
        return (typeof prior === 'string' ? prior : JSON.stringify(prior)) === fingerprint
          ? 'duplicate'
          : reject('Conflicting duplicate event. Refresh the host snapshot.');
      if (e.sequence <= snapshot.lastSequence) return 'rejected';
      if (seen.size + pending.size >= maxReplay)
        return reject('Replay window reached. Refresh the host snapshot.');
      if (e.sequence > snapshot.lastSequence + 1) {
        if (pending.has(e.sequence) || pending.size >= maxBuffered)
          return reject('Conflicting sequence or recovery buffer limit reached.');
        pending.set(e.sequence, e);
        snapshot = {
          ...snapshot,
          stale: true,
          diagnostic: 'Events are missing. Waiting for host replay.',
        };
        if (!gapTimer)
          gapTimer = setTimeout(
            () => reject('Replay timed out. Refresh the host snapshot.'),
            gapTimeoutMs,
          );
        notify();
        return 'buffered';
      }
      try {
        apply(e);
        while (pending.has(snapshot.lastSequence + 1)) {
          const next = pending.get(snapshot.lastSequence + 1)!;
          pending.delete(next.sequence);
          apply(next);
        }
        if (!pending.size) {
          clearTimeout(gapTimer);
          gapTimer = undefined;
          snapshot = {
            ...snapshot,
            stale: snapshot.connection !== 'connected',
            diagnostic:
              snapshot.connection === 'connected'
                ? null
                : 'Connection lost. Results may be out of date.',
          };
        }
        notify();
        return 'applied';
      } catch (error) {
        return reject(error instanceof Error ? error.message : 'Projection failed.');
      }
    },
    replaceSnapshot(input) {
      if (disposed) return;
      const next = checkedSnapshot(input);
      if (next.streamId === snapshot.streamId) {
        if (next.schemaVersion !== snapshot.schemaVersion)
          throw new Error('Protocol version cannot change within a stream.');
        if (
          next.run.id !== snapshot.run.id ||
          next.run.threadId !== snapshot.run.threadId ||
          next.run.attemptId !== snapshot.run.attemptId
        )
          throw new Error('Run, thread and attempt identity cannot change within a stream.');
        if (next.lastSequence < snapshot.lastSequence)
          throw new Error('Snapshot would regress the stream cursor.');
      }
      clearTimeout(gapTimer);
      gapTimer = undefined;
      snapshot = freeze(next);
      seen.clear();
      pending.clear();
      fatal = false;
      notify();
    },
    setConnection(connection) {
      if (disposed) return;
      fatal = true;
      clearTimeout(gapTimer);
      pending.clear();
      snapshot = {
        ...snapshot,
        connection,
        stale: true,
        diagnostic: 'Connection changed. Refresh the host snapshot before continuing.',
      };
      notify();
    },
    dispose() {
      disposed = true;
      clearTimeout(gapTimer);
      pending.clear();
      seen.clear();
      listeners.clear();
    },
  };
}
