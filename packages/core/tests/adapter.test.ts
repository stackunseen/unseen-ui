import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAdapterSession, adapterLimits } from '@stackunseen/ui-core/adapter';
import type {
  AdapterCommand,
  AdapterObserver,
  AdapterPort,
  AdapterScope,
} from '@stackunseen/ui-core/adapter';
import type { RuntimeSnapshot, Event } from '@stackunseen/ui-core';
import type { ConversationHistory } from '@stackunseen/ui-core/history';

const scope: AdapterScope = {
  workspaceId: 'workspace',
  branchId: 'branch',
  threadId: 'thread',
  runId: 'run',
  attemptId: 'attempt',
  streamId: 'stream',
  schemaVersion: 1,
};
const snapshot = (): RuntimeSnapshot => ({
  schemaVersion: 1,
  streamId: 'stream',
  lastSequence: 0,
  run: { id: 'run', threadId: 'thread', attemptId: 'attempt', version: 0, lifecycle: 'queued' },
  messages: [],
  steps: [],
  tools: [],
  sources: [],
  artifacts: [],
  approval: null,
  connection: 'connected',
  stale: false,
  diagnostic: null,
});
const event = (sequence = 1): Event => ({
  schemaVersion: 1,
  eventId: `event-${sequence}`,
  streamId: 'stream',
  sequence,
  threadId: 'thread',
  runId: 'run',
  attemptId: 'attempt',
  occurredAt: '2026-09-30T10:00:00Z',
  type: 'message.created',
  payload: {
    id: `message-${sequence}`,
    role: 'assistant',
    text: `Message ${sequence}`,
    state: 'complete',
    revision: 0,
  },
});
const command = (commandId = 'command'): AdapterCommand => ({
  commandId,
  scope,
  expectedRunVersion: 0,
  operation: 'request-review',
  payload: { id: 'resource', version: '1' },
});
const history = (): ConversationHistory => ({
  context: {
    workspaceId: 'workspace',
    threadId: 'thread',
    branchId: 'branch',
    snapshotId: 'history-snapshot',
    version: '1',
  },
  messages: [],
  older: { state: 'available', cursor: 'older' },
  newer: { state: 'end' },
});
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function setup(overrides: Partial<AdapterPort> = {}) {
  let observer!: AdapterObserver;
  const close = vi.fn();
  const dispatch = vi.fn(async (original: AdapterCommand) => ({
    command: original,
    outcome: 'accepted',
  }));
  const lookup = vi.fn(async (original: AdapterCommand) => ({
    command: original,
    outcome: 'accepted',
  }));
  const port: AdapterPort = {
    name: 'Test host',
    version: '1',
    open: vi.fn(async (_scope, sink) => {
      observer = sink;
      return { checkpoint: { scope, snapshot: snapshot(), history: history() }, close };
    }),
    dispatch,
    lookup,
    ...overrides,
  };
  const session = createAdapterSession(port, scope, snapshot(), { acknowledgementTimeoutMs: 20 });
  sessions.push(session);
  return { session, port, dispatch, lookup, close, observer: () => observer };
}
const sessions: ReturnType<typeof createAdapterSession>[] = [];
afterEach(() => {
  sessions.splice(0).forEach((session) => session.dispose());
  vi.useRealTimers();
});

describe('coherent checkpoint/channel recovery', () => {
  it('publishes checkpoint runtime and history together and isolates consumer failures', async () => {
    const { session, observer } = setup();
    const views: ReturnType<typeof session.getSnapshot>[] = [];
    session.subscribe(() => {
      throw new Error('Consumer failure');
    });
    session.subscribe(() => {
      views.push(session.getSnapshot());
    });
    expect(await session.refresh()).toBe('ready');
    expect(
      views
        .filter((view) => view.connection.state === 'connected')
        .every((view) => !!view.history && !view.opening),
    ).toBe(true);
    expect(() => observer().event(event())).not.toThrow();
    expect(session.getSnapshot().runtime.lastSequence).toBe(1);
    expect(session.getSnapshot().connection.recovery).toBe('none');
    expect((await session.submit(command())).state).toBe('acknowledged');
  });
  it('starts with unknown freshness and adopts validated checkpoint/history without claiming replay', async () => {
    const { session } = setup();
    expect(session.getSnapshot().connection).toMatchObject({
      state: 'disconnected',
      freshness: 'unknown',
      adapter: { resume: false, snapshot: true },
    });
    expect(await session.refresh()).toBe('ready');
    expect(session.getSnapshot()).toMatchObject({
      opening: false,
      connection: { state: 'connected', freshness: 'current', recovery: 'none' },
      history: history(),
    });
    expect(Object.isFrozen(session.getSnapshot().connection)).toBe(true);
    expect(Object.isFrozen(session.getSnapshot().history?.messages)).toBe(true);
  });
  it('does not manufacture recovery capability for a host without coherent open', async () => {
    const { session } = setup({ open: undefined });
    expect(await session.refresh()).toBe('failed');
    expect(session.getSnapshot().connection.adapter).toMatchObject({
      resume: false,
      snapshot: false,
    });
    expect(session.getSnapshot().connection.freshness).toBe('unknown');
  });
  it('copies pre-checkpoint events and drains them only after accepting the matching checkpoint', async () => {
    const raw = event();
    const { session } = setup({
      open: async (_scope, observer) => {
        observer.event(raw);
        (raw.payload as { text: string }).text = 'Mutated after emission';
        return { checkpoint: { scope, snapshot: snapshot() }, close() {} };
      },
    });
    expect(await session.refresh()).toBe('ready');
    expect(session.getSnapshot().runtime.messages[0]?.text).toBe('Message 1');
    expect(session.getSnapshot().runtime.lastSequence).toBe(1);
  });
  it('permanently invalidates an overflowing open and releases its late handle once', async () => {
    const close = vi.fn();
    const { session } = setup({
      open: async (_scope, observer) => {
        for (let i = 0; i <= adapterLimits.bufferedEvents; i++) observer.event(event(i + 1));
        return { checkpoint: { scope, snapshot: snapshot() }, close };
      },
    });
    await session.refresh();
    expect(session.getSnapshot().connection).toMatchObject({
      state: 'disconnected',
      recovery: 'incompatible',
    });
    expect(session.getSnapshot().runtime.messages).toHaveLength(0);
    expect(close).toHaveBeenCalledTimes(1);
    session.dispose();
    expect(close).toHaveBeenCalledTimes(1);
  });
  it('discards old malformed callbacks before validation and releases replaced open handles', async () => {
    const first = deferred<{
      checkpoint: { scope: AdapterScope; snapshot: RuntimeSnapshot };
      close(): void;
    }>();
    let old!: AdapterObserver;
    const close = vi.fn();
    let count = 0;
    const { session } = setup({
      open: async (_scope, observer) => {
        if (++count === 1) {
          old = observer;
          return first.promise;
        }
        return { checkpoint: { scope, snapshot: snapshot() }, close() {} };
      },
    });
    const pending = session.refresh();
    expect(await session.refresh()).toBe('ready');
    const current = session.getSnapshot();
    old.event({ unsupported: true });
    old.disconnected();
    expect(session.getSnapshot()).toBe(current);
    first.resolve({ checkpoint: { scope, snapshot: snapshot() }, close });
    expect(await pending).toBe('obsolete');
    expect(close).toHaveBeenCalledTimes(1);
  });
  it.each([
    'workspaceId',
    'branchId',
    'threadId',
    'runId',
    'attemptId',
    'streamId',
    'schemaVersion',
  ] as const)('rejects a checkpoint with changed %s before publishing it', async (key) => {
    const changed = { ...scope, [key]: key === 'schemaVersion' ? 2 : 'different' };
    const close = vi.fn();
    const { session } = setup({
      open: async () => ({ checkpoint: { scope: changed, snapshot: snapshot() }, close }),
    });
    expect(await session.refresh()).toBe('failed');
    expect(session.getSnapshot().runtime.run.id).toBe('run');
    expect(close).toHaveBeenCalledTimes(1);
  });
  it('rejects current-generation invalid content without throwing to the host callback', async () => {
    const { session, observer } = setup();
    await session.refresh();
    const getter = vi.fn(() => {
      throw new Error('Should not execute');
    });
    const bad = Object.defineProperty({}, 'type', { get: getter, enumerable: true });
    expect(() => observer().event(bad)).not.toThrow();
    expect(getter).not.toHaveBeenCalled();
    expect(session.getSnapshot().connection.recovery).toBe('incompatible');
  });
  it('preserves explicit stale state for an ordering gap while transport is connected', async () => {
    const { session, observer } = setup();
    await session.refresh();
    observer().event(event(2));
    expect(session.getSnapshot().connection).toMatchObject({
      state: 'connected',
      freshness: 'stale',
    });
    observer().event(event(1));
    expect(session.getSnapshot().connection.freshness).toBe('current');
    expect(session.getSnapshot().runtime.messages).toHaveLength(2);
  });
  it('rejects regressed versions and equal-cursor conflicting canonical content on refresh', async () => {
    let next = snapshot();
    const { session } = setup({
      open: async () => ({ checkpoint: { scope, snapshot: next }, close() {} }),
    });
    await session.refresh();
    next = { ...snapshot(), messages: [event().payload as RuntimeSnapshot['messages'][number]] };
    expect(await session.refresh()).toBe('failed');
    expect(session.getSnapshot().runtime.messages).toHaveLength(0);
    next = { ...snapshot(), lastSequence: 2, run: { ...snapshot().run, version: 2 } };
    expect(await session.refresh()).toBe('ready');
    next = { ...next, lastSequence: 3, run: { ...next.run, version: 1 } };
    expect(await session.refresh()).toBe('failed');
    expect(session.getSnapshot().runtime.run.version).toBe(2);
  });
  it('leaves inputs mutable and closes only its owned channel on disposal', async () => {
    const initial = snapshot();
    const localScope = { ...scope };
    const window = history();
    const close = vi.fn();
    const session = createAdapterSession(
      {
        name: 'Host',
        version: '1',
        open: async () => ({
          checkpoint: { scope: localScope, snapshot: initial, history: window },
          close,
        }),
      },
      localScope,
      initial,
    );
    sessions.push(session);
    await session.refresh();
    expect(Object.isFrozen(initial)).toBe(false);
    expect(Object.isFrozen(localScope)).toBe(false);
    expect(Object.isFrozen(window)).toBe(false);
    const listener = vi.fn();
    session.subscribe(listener);
    session.dispose();
    session.dispose();
    expect(close).toHaveBeenCalledTimes(1);
    expect(await session.refresh()).toBe('obsolete');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('original command acknowledgements', () => {
  it('accepts typed optional envelope fields while rejecting undefined JSON payload data', async () => {
    const localScope = { ...scope, branchId: undefined };
    const session = createAdapterSession(
      {
        name: 'Typed host',
        version: '1',
        open: async () => ({ checkpoint: { scope: localScope, snapshot: snapshot() }, close() {} }),
        dispatch: async (original) => ({
          command: original,
          outcome: 'accepted',
          detail: undefined,
        }),
      },
      localScope,
      snapshot(),
    );
    sessions.push(session);
    await session.refresh();
    expect((await session.submit({ ...command(), scope: localScope })).state).toBe('acknowledged');
    await expect(
      session.submit({
        ...command('invalid'),
        scope: localScope,
        payload: { optional: undefined },
      } as unknown as AdapterCommand),
    ).rejects.toThrow('plain');
  });
  it('does not begin a deferred dispatch after disposal', async () => {
    const { session, dispatch } = setup();
    await session.refresh();
    const submission = session.submit(command());
    session.dispose();
    await submission;
    await Promise.resolve();
    expect(dispatch).not.toHaveBeenCalled();
  });
  it('acknowledges submission without changing canonical execution and never redispatches an ID', async () => {
    const { session, dispatch } = setup();
    await session.refresh();
    const before = session.getSnapshot().runtime;
    const original = command();
    const record = await session.submit(original);
    expect(record.state).toBe('acknowledged');
    expect(session.getSnapshot().runtime).toBe(before);
    expect(Object.isFrozen(original)).toBe(false);
    expect(Object.isFrozen(record.command.payload)).toBe(true);
    await session.submit({ ...command(), payload: { version: '1', id: 'resource' } });
    expect(dispatch).toHaveBeenCalledTimes(1);
    await expect(session.submit({ ...command(), payload: { id: 'other' } })).rejects.toThrow(
      'reused',
    );
  });
  it('retains lost acknowledgements across refresh and reconciles only the original command', async () => {
    const dispatch = vi.fn(async () => {
      throw new Error('Response lost after host acceptance');
    });
    const { session, lookup } = setup({ dispatch });
    await session.refresh();
    expect((await session.submit(command())).state).toBe('outcome-unknown');
    await session.refresh();
    expect(session.getSnapshot().commands[0]?.state).toBe('outcome-unknown');
    expect((await session.reconcile('command')).state).toBe('acknowledged');
    expect(lookup.mock.calls[0]?.[0]).toEqual(command());
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
  it.each(['unknown', 'not-found'] as const)(
    'keeps %s receipts unresolved and does not resend',
    async (outcome) => {
      const dispatch = vi.fn(async (original) => ({ command: original, outcome }));
      const { session } = setup({
        dispatch,
        lookup: async (original) => ({ command: original, outcome }),
      });
      await session.refresh();
      await session.submit(command());
      await session.reconcile('command');
      await session.submit(command());
      expect(session.getSnapshot().commands[0]?.state).toBe('outcome-unknown');
      expect(dispatch).toHaveBeenCalledTimes(1);
    },
  );
  it('rejects conflicting receipts and preserves immutable original content after host input changes', async () => {
    const original = command();
    const { session } = setup({
      dispatch: async (input) => ({
        command: { ...input, expectedRunVersion: 99 },
        outcome: 'accepted',
      }),
    });
    await session.refresh();
    const record = await session.submit(original);
    (original.payload as { id: string }).id = 'changed';
    expect(record.state).toBe('outcome-unknown');
    expect((record.command.payload as { id: string }).id).toBe('resource');
  });
  it('times out visibly, accepts a late exact acknowledgement across transport refresh, and never repeats the command', async () => {
    vi.useFakeTimers();
    const reply = deferred<unknown>();
    const dispatch = vi.fn(() => reply.promise);
    const { session } = setup({ dispatch });
    await session.refresh();
    const submission = session.submit(command());
    await vi.advanceTimersByTimeAsync(20);
    expect((await submission).state).toBe('outcome-unknown');
    await session.refresh();
    reply.resolve({ command: command(), outcome: 'accepted' });
    await Promise.resolve();
    await Promise.resolve();
    expect(session.getSnapshot().commands[0]?.state).toBe('acknowledged');
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('does not regress a lookup settlement when the original dispatch rejects later', async () => {
    const reply = deferred<unknown>();
    const { session, observer } = setup({ dispatch: () => reply.promise });
    await session.refresh();
    const submitting = session.submit(command());
    await Promise.resolve();
    const views: ReturnType<typeof session.getSnapshot>[] = [];
    session.subscribe(() => {
      views.push(session.getSnapshot());
    });
    observer().disconnected();
    expect(
      views.every((view) => view.connection.state !== 'disconnected' || view.runtime.stale),
    ).toBe(true);
    expect(session.getSnapshot().commands[0]?.state).toBe('outcome-unknown');
    await session.reconcile('command');
    reply.reject(new Error('Late transport error'));
    expect((await submitting).state).toBe('outcome-unknown');
    expect(session.getSnapshot().commands[0]?.state).toBe('acknowledged');
  });
  it('ignores an older concurrent lookup after a later lookup settles', async () => {
    const older = deferred<unknown>();
    let calls = 0;
    const { session } = setup({
      dispatch: async (original) => ({ command: original, outcome: 'unknown' }),
      lookup: async (original) =>
        ++calls === 1 ? older.promise : { command: original, outcome: 'accepted' },
    });
    await session.refresh();
    await session.submit(command());
    const first = session.reconcile('command');
    await session.reconcile('command');
    older.resolve({ command: command(), outcome: 'not-found' });
    await first;
    expect(session.getSnapshot().commands[0]?.state).toBe('acknowledged');
  });
  it('requires current exact scope/version and known host capability before dispatch', async () => {
    const { session, observer, dispatch } = setup();
    await expect(session.submit(command())).rejects.toThrow('current');
    await session.refresh();
    await expect(session.submit({ ...command(), expectedRunVersion: 1 })).rejects.toThrow(
      'current',
    );
    await expect(
      session.submit({ ...command(), scope: { ...scope, branchId: 'other' } }),
    ).rejects.toThrow('scope');
    observer().event(event(2));
    await expect(session.submit(command())).rejects.toThrow('current');
    expect(dispatch).not.toHaveBeenCalled();
  });
  it('bounds command data and unresolved retention without evicting original records', async () => {
    const { session, dispatch } = setup({
      dispatch: async (original) => ({ command: original, outcome: 'unknown' }),
    });
    await session.refresh();
    await expect(session.submit({ ...command(), payload: 'x'.repeat(64_001) })).rejects.toThrow(
      'bounds',
    );
    const getter = vi.fn(() => 'secret');
    const input = Object.defineProperty(command(), 'payload', { get: getter });
    await expect(session.submit(input)).rejects.toThrow('accessors');
    expect(getter).not.toHaveBeenCalled();
    for (let i = 0; i < adapterLimits.commands; i++) await session.submit(command(`command-${i}`));
    await expect(session.submit(command('overflow'))).rejects.toThrow('retention');
    expect(session.getSnapshot().commands).toHaveLength(adapterLimits.commands);
    expect(dispatch).not.toHaveBeenCalled();
  });
  it('disposes timers and ignores late acknowledgements without declaring the outcome failed', async () => {
    vi.useFakeTimers();
    const reply = deferred<unknown>();
    const { session } = setup({ dispatch: () => reply.promise });
    await session.refresh();
    const submission = session.submit(command());
    await Promise.resolve();
    const before = session.getSnapshot();
    session.dispose();
    expect((await submission).state).toBe('outcome-unknown');
    expect(vi.getTimerCount()).toBe(0);
    reply.resolve({ command: command(), outcome: 'accepted' });
    await Promise.resolve();
    await Promise.resolve();
    expect(session.getSnapshot()).toBe(before);
  });
});

describe('exact history windows', () => {
  it('validates page response context and never publishes a different host snapshot', async () => {
    const read = vi.fn(async () => ({
      ...history(),
      context: { ...history().context, version: '2' },
    }));
    const { session } = setup({ readHistory: read });
    await session.refresh();
    const before = session.getSnapshot().history;
    expect(
      await session.page({ context: history().context, direction: 'older', cursor: 'older' }),
    ).toBe('failed');
    expect(session.getSnapshot().history).toBe(before);
    expect(session.getSnapshot().historyError).toContain('original');
    expect(
      await session.page({
        context: { ...history().context, snapshotId: 'old' },
        direction: 'older',
        cursor: 'older',
      }),
    ).toBe('obsolete');
    expect(read).toHaveBeenCalledTimes(1);
  });
  it('accepts a bounded same-context window and ignores a page arriving after refresh', async () => {
    const response = deferred<unknown>();
    const { session } = setup({ readHistory: () => response.promise });
    await session.refresh();
    const page = session.page({ context: history().context, direction: 'older', cursor: 'older' });
    await session.refresh();
    response.resolve(history());
    expect(await page).toBe('obsolete');
    expect(session.getSnapshot().historyLoading).toBe(false);
    const next = setup({
      readHistory: async () => ({
        ...history(),
        messages: [event().payload],
        older: { state: 'end' },
      }),
    });
    await next.session.refresh();
    expect(
      await next.session.page({ context: history().context, direction: 'older', cursor: 'older' }),
    ).toBe('applied');
    expect(next.session.getSnapshot().history?.messages).toHaveLength(1);
  });
  it('rejects a checkpoint history from another branch before adopting its runtime', async () => {
    const { session } = setup({
      open: async () => ({
        checkpoint: {
          scope,
          snapshot: { ...snapshot(), lastSequence: 1 },
          history: { ...history(), context: { ...history().context, branchId: 'other' } },
        },
        close() {},
      }),
    });
    expect(await session.refresh()).toBe('failed');
    expect(session.getSnapshot().runtime.lastSequence).toBe(0);
  });
});
