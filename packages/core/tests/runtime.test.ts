import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canTransition,
  createRuntime,
  safeUrl,
  validateApprovalDecision,
} from '@ai-interaction/core';
import type { Event, MessageData, RuntimeSnapshot } from '@ai-interaction/core';
import { initialSnapshot, proposal } from '../../../apps/docs/lib/fixtures';

afterEach(() => vi.useRealTimers());
function started(sequence = 1): Event {
  return {
    schemaVersion: 1,
    eventId: `e-${sequence}`,
    sequence,
    streamId: 'stream-demo',
    threadId: 'thread-demo',
    runId: 'run-demo',
    attemptId: 'attempt-1',
    occurredAt: '2026-09-29T12:00:00Z',
    type: 'run.updated',
    payload: { lifecycle: 'running', version: sequence },
  };
}
describe('runtime projection', () => {
  it('requires an authoritative snapshot after transport changes', () => {
    const runtime = createRuntime(initialSnapshot());
    runtime.setConnection('disconnected');
    runtime.setConnection('connected');
    expect(runtime.ingest(started())).toBe('rejected');
    expect(runtime.getSnapshot().stale).toBe(true);
    runtime.replaceSnapshot(initialSnapshot());
    expect(runtime.ingest(started())).toBe('applied');
    runtime.dispose();
  });
  it('rejects snapshots with duplicate identity or mismatched approvals', () => {
    const snapshot = initialSnapshot();
    const m = {
      id: 'same',
      role: 'user' as const,
      text: 'x',
      state: 'complete' as const,
      revision: 0,
    };
    expect(() => createRuntime({ ...snapshot, messages: [m, m] })).toThrow('Duplicate');
    expect(() => createRuntime({ ...snapshot, approval: proposal })).toThrow('unavailable');
  });
  it('rejects an unavailable approval tool without publishing an invalid proposal', () => {
    const runtime = createRuntime(initialSnapshot());
    const published: RuntimeSnapshot[] = [];
    runtime.subscribe(() => published.push(runtime.getSnapshot()));
    expect(runtime.ingest({ ...started(), type: 'approval.requested', payload: proposal })).toBe(
      'rejected',
    );
    expect(runtime.getSnapshot()).toMatchObject({ lastSequence: 0, approval: null, stale: true });
    expect(published).toHaveLength(1);
    expect(published[0]?.approval).toBeNull();
    runtime.dispose();
  });
  it('accepts an approval bound to an existing tool and preserves its exact scope', () => {
    const runtime = createRuntime({
      ...initialSnapshot(),
      tools: [
        {
          id: proposal.toolCallId,
          name: 'Archive accounts',
          revision: 0,
          state: 'approval-required',
          input: '{"accountIds":[1,2,3]}',
        },
      ],
    });
    expect(runtime.ingest({ ...started(), type: 'approval.requested', payload: proposal })).toBe(
      'applied',
    );
    expect(runtime.getSnapshot().approval).toEqual(proposal);
    expect(runtime.getSnapshot().approval).not.toBe(proposal);
    expect(Object.isFrozen(proposal)).toBe(false);
    expect(runtime.getSnapshot().tools[0]?.state).toBe('approval-required');
    runtime.dispose();
  });
  it('applies exact duplicates once and rejects conflicting duplicates', () => {
    const runtime = createRuntime(initialSnapshot());
    expect(runtime.ingest(started())).toBe('applied');
    const before = runtime.getSnapshot();
    expect(runtime.ingest(started())).toBe('duplicate');
    expect(runtime.getSnapshot()).toBe(before);
    expect(runtime.ingest({ ...started(), payload: { lifecycle: 'failed', version: 1 } })).toBe(
      'rejected',
    );
    expect(runtime.getSnapshot().stale).toBe(true);
    runtime.dispose();
  });
  it('buffers a gap, applies ordered replay and enforces buffer limits', () => {
    const runtime = createRuntime(initialSnapshot(), { maxBuffered: 1 });
    expect(runtime.ingest(started(2))).toBe('buffered');
    expect(runtime.getSnapshot().lastSequence).toBe(0);
    expect(runtime.ingest(started())).toBe('applied');
    expect(runtime.getSnapshot()).toMatchObject({
      lastSequence: 2,
      stale: false,
      run: { version: 2 },
    });
    expect(runtime.ingest(started(4))).toBe('buffered');
    expect(runtime.ingest(started(5))).toBe('rejected');
    runtime.dispose();
  });
  it('times out gaps and recovers only through a current snapshot', () => {
    vi.useFakeTimers();
    const runtime = createRuntime(initialSnapshot(), { gapTimeoutMs: 50 });
    runtime.ingest(started(2));
    vi.advanceTimersByTime(51);
    expect(runtime.getSnapshot().diagnostic).toContain('timed out');
    expect(runtime.ingest(started())).toBe('rejected');
    runtime.replaceSnapshot(initialSnapshot());
    expect(runtime.ingest(started())).toBe('applied');
    expect(() => runtime.replaceSnapshot(initialSnapshot())).toThrow('regress');
    runtime.dispose();
  });
  it.each(['id', 'threadId', 'attemptId'] as const)(
    'rejects a same-stream %s replacement without changing replay or the snapshot',
    (identity) => {
      const runtime = createRuntime(initialSnapshot());
      const notify = vi.fn();
      runtime.subscribe(notify);
      expect(runtime.ingest(started(2))).toBe('buffered');
      const before = runtime.getSnapshot();
      notify.mockClear();

      expect(() =>
        runtime.replaceSnapshot({
          ...initialSnapshot(),
          run: { ...initialSnapshot().run, [identity]: 'different' },
        }),
      ).toThrow('identity cannot change within a stream');
      expect(runtime.getSnapshot()).toBe(before);
      expect(notify).not.toHaveBeenCalled();
      expect(runtime.ingest(started(2))).toBe('duplicate');
      expect(runtime.ingest(started())).toBe('applied');
      expect(runtime.getSnapshot()).toMatchObject({ lastSequence: 2, run: { version: 2 } });
      runtime.dispose();
    },
  );
  it('keeps a gap timeout active after an invalid same-stream replacement', () => {
    vi.useFakeTimers();
    const runtime = createRuntime(initialSnapshot(), { gapTimeoutMs: 50 });
    expect(runtime.ingest(started(2))).toBe('buffered');
    expect(() =>
      runtime.replaceSnapshot({
        ...initialSnapshot(),
        run: { ...initialSnapshot().run, attemptId: 'attempt-2' },
      }),
    ).toThrow('identity');
    vi.advanceTimersByTime(51);
    expect(runtime.getSnapshot()).toMatchObject({ lastSequence: 0, stale: true });
    expect(runtime.getSnapshot().diagnostic).toContain('timed out');
    expect(runtime.ingest(started())).toBe('rejected');
    runtime.dispose();
  });
  it('does not clear a transport recovery requirement on a rejected replacement', () => {
    const runtime = createRuntime(initialSnapshot());
    runtime.setConnection('disconnected');
    const before = runtime.getSnapshot();
    expect(() =>
      runtime.replaceSnapshot({
        ...initialSnapshot(),
        run: { ...initialSnapshot().run, threadId: 'different-thread' },
      }),
    ).toThrow('identity');
    expect(runtime.getSnapshot()).toBe(before);
    expect(runtime.ingest(started())).toBe('rejected');
    runtime.replaceSnapshot(initialSnapshot());
    expect(runtime.ingest(started())).toBe('applied');
    runtime.dispose();
  });
  it('accepts an authoritative same-scope refresh at the current or a newer cursor', () => {
    const runtime = createRuntime(initialSnapshot(), { maxReplay: 1 });
    const serverSnapshot = runtime.getServerSnapshot();
    expect(runtime.ingest(started())).toBe('applied');
    expect(runtime.ingest(started(2))).toBe('rejected');
    const refreshed: RuntimeSnapshot = {
      ...initialSnapshot(),
      lastSequence: 1,
      run: { ...initialSnapshot().run, lifecycle: 'running', version: 1 },
    };
    runtime.replaceSnapshot(refreshed);
    expect(runtime.getSnapshot()).toEqual(refreshed);
    expect(runtime.getSnapshot()).not.toBe(refreshed);
    expect(Object.isFrozen(refreshed)).toBe(false);
    expect(Object.isFrozen(refreshed.run)).toBe(false);
    expect(runtime.ingest(started(2))).toBe('applied');
    runtime.replaceSnapshot({
      ...refreshed,
      lastSequence: 10,
      run: { ...refreshed.run, version: 3 },
    });
    expect(runtime.ingest(started(2))).toBe('rejected');
    expect(runtime.ingest({ ...started(11), payload: { lifecycle: 'paused', version: 4 } })).toBe(
      'applied',
    );
    expect(runtime.getServerSnapshot()).toBe(serverSnapshot);
    runtime.dispose();
  });
  it('allows a new stream to reset scope, cursor and protocol without retaining old replay', () => {
    vi.useFakeTimers();
    const runtime = createRuntime(initialSnapshot(), { gapTimeoutMs: 50, maxReplay: 2 });
    expect(runtime.ingest(started())).toBe('applied');
    expect(runtime.ingest(started(3))).toBe('buffered');
    const replacement: RuntimeSnapshot = {
      ...initialSnapshot(),
      schemaVersion: 2,
      streamId: 'stream-2',
      run: { ...initialSnapshot().run, id: 'run-2', threadId: 'thread-2', attemptId: 'attempt-2' },
    };
    runtime.replaceSnapshot(replacement);
    vi.advanceTimersByTime(51);
    expect(runtime.getSnapshot()).toEqual(replacement);
    expect(runtime.ingest(started(3))).toBe('rejected');
    expect(
      runtime.ingest({
        ...started(),
        schemaVersion: 2,
        streamId: replacement.streamId,
        runId: replacement.run.id,
        threadId: replacement.run.threadId,
        attemptId: replacement.run.attemptId,
      }),
    ).toBe('applied');
    expect(runtime.getSnapshot().lastSequence).toBe(1);
    runtime.dispose();
  });
  it.each([
    { lastSequence: Number.MAX_SAFE_INTEGER + 1 },
    { streamId: 's'.repeat(161) },
    {
      messages: Array.from({ length: 501 }, (_, index) => ({
        id: `message-${index}`,
        role: 'user',
        text: '',
        state: 'complete',
        revision: 0,
      })),
    },
  ])('validates replacement bounds before clearing a pending replay (%#)', (invalid) => {
    const runtime = createRuntime(initialSnapshot());
    expect(runtime.ingest(started(2))).toBe('buffered');
    const before = runtime.getSnapshot();
    const notify = vi.fn();
    runtime.subscribe(notify);
    expect(() => runtime.replaceSnapshot({ ...initialSnapshot(), ...invalid })).toThrow();
    expect(runtime.getSnapshot()).toBe(before);
    expect(notify).not.toHaveBeenCalled();
    expect(runtime.ingest(started())).toBe('applied');
    expect(runtime.getSnapshot().lastSequence).toBe(2);
    runtime.dispose();
  });
  it('rejects unknown events and events from an old attempt', () => {
    const runtime = createRuntime(initialSnapshot());
    expect(runtime.ingest({ ...started(), attemptId: 'old-attempt' })).toBe('rejected');
    expect(runtime.getSnapshot().lastSequence).toBe(0);
    expect(runtime.ingest({ ...started(), type: 'future.unknown' })).toBe('rejected');
    expect(runtime.getSnapshot().stale).toBe(true);
    runtime.dispose();
  });
  it('does not regress terminal runs and freezes snapshots', () => {
    const initial = initialSnapshot();
    initial.run.lifecycle = 'succeeded';
    const runtime = createRuntime(initial);
    expect(runtime.ingest(started())).toBe('rejected');
    expect(runtime.getSnapshot().run.lifecycle).toBe('succeeded');
    expect(Object.isFrozen(runtime.getSnapshot().run)).toBe(true);
    expect(canTransition('cancelled', 'running')).toBe(false);
    runtime.dispose();
  });
  it('requires contiguous text offsets and keeps unrelated fields stable', () => {
    const snapshot: RuntimeSnapshot = {
      ...initialSnapshot(),
      run: { ...initialSnapshot().run, lifecycle: 'running' },
      messages: [
        { id: 'message', role: 'assistant', text: 'Hello', state: 'streaming', revision: 0 },
      ],
    };
    const runtime = createRuntime(snapshot);
    const priorSteps = runtime.getSnapshot().steps;
    const delta = {
      ...started(),
      type: 'message.delta',
      payload: { id: 'message', offset: 5, text: ' world' },
    };
    expect(runtime.ingest(delta)).toBe('applied');
    expect(runtime.getSnapshot().messages[0]?.text).toBe('Hello world');
    expect(runtime.getSnapshot().steps).toBe(priorSteps);
    expect(runtime.ingest({ ...delta, eventId: '2', sequence: 2 })).toBe('rejected');
    expect(runtime.getSnapshot().messages[0]?.text).toBe('Hello world');
    runtime.dispose();
  });
});
describe('runtime plain-data boundaries', () => {
  it('validates unknown initial data instead of trusting a typed caller', () => {
    const input: unknown = JSON.parse(JSON.stringify(initialSnapshot()));
    const runtime = createRuntime(input);
    expect(runtime.getSnapshot()).toEqual(initialSnapshot());
    runtime.dispose();
    for (const invalid of [null, 1, 'snapshot', {}, { ...initialSnapshot(), run: null }])
      expect(() => createRuntime(invalid)).toThrow();
  });
  it.each(['root', 'nested'] as const)(
    'rejects %s snapshot accessors without reading them',
    (at) => {
      const runtime = createRuntime(initialSnapshot());
      expect(runtime.ingest(started(2))).toBe('buffered');
      const before = runtime.getSnapshot();
      const read = vi.fn(() => {
        throw new Error('Host getter must not run.');
      });
      const replacement = initialSnapshot();
      Object.defineProperty(
        at === 'root' ? replacement : replacement.run,
        at === 'root' ? 'run' : 'id',
        {
          enumerable: true,
          get: read,
        },
      );
      expect(() => runtime.replaceSnapshot(replacement)).toThrow('bounded plain runtime data');
      expect(read).not.toHaveBeenCalled();
      expect(runtime.getSnapshot()).toBe(before);
      expect(runtime.ingest(started())).toBe('applied');
      expect(runtime.getSnapshot().lastSequence).toBe(2);
      runtime.dispose();
    },
  );
  it.each(['root', 'nested'] as const)('rejects %s event accessors without reading them', (at) => {
    const runtime = createRuntime(initialSnapshot());
    const read = vi.fn(() => {
      throw new Error('Host getter must not run.');
    });
    const event = started();
    Object.defineProperty(
      at === 'root' ? event : event.payload,
      at === 'root' ? 'type' : 'version',
      {
        enumerable: true,
        get: read,
      },
    );
    expect(runtime.ingest(event)).toBe('rejected');
    expect(read).not.toHaveBeenCalled();
    expect(runtime.getSnapshot()).toMatchObject({
      lastSequence: 0,
      stale: true,
      run: { lifecycle: 'queued', version: 0 },
    });
    expect(runtime.ingest(started())).toBe('rejected');
    runtime.replaceSnapshot(initialSnapshot());
    expect(runtime.ingest(started())).toBe('applied');
    runtime.dispose();
  });
  it.each(['prototype', 'keys', 'descriptor'] as const)(
    'contains a throwing Proxy %s inspection without mutating a replacement',
    (at) => {
      const fail = () => {
        throw new Error('Untrusted reflection failure.');
      };
      const handler: ProxyHandler<object> =
        at === 'prototype'
          ? { getPrototypeOf: fail }
          : at === 'keys'
            ? { ownKeys: fail }
            : { getOwnPropertyDescriptor: fail };
      const runtime = createRuntime(initialSnapshot());
      const before = runtime.getSnapshot();
      expect(() => runtime.replaceSnapshot(new Proxy(initialSnapshot(), handler))).toThrow(
        'bounded plain runtime data',
      );
      expect(runtime.getSnapshot()).toBe(before);
      expect(runtime.ingest(new Proxy(started(), handler))).toBe('rejected');
      expect(runtime.getSnapshot().lastSequence).toBe(0);
      runtime.dispose();
    },
  );
  it('parses inert descriptor copies without reading the original input properties', () => {
    const read = vi.fn(() => {
      throw new Error('Direct property reads are forbidden.');
    });
    const host = initialSnapshot();
    const runtime = createRuntime(new Proxy(host, { get: read }));
    expect(runtime.ingest(new Proxy(started(), { get: read }))).toBe('applied');
    expect(runtime.getSnapshot()).toMatchObject({ lastSequence: 1, run: { version: 1 } });
    expect(read).not.toHaveBeenCalled();
    expect(Object.isFrozen(host)).toBe(false);
    expect(Object.isFrozen(host.run)).toBe(false);
    runtime.dispose();
  });
  it.each(['large', 'sparse', 'nonplain', 'deep', 'cyclic', 'string', 'nodes'] as const)(
    'rejects %s input before projection or replacement mutation',
    (kind) => {
      const shared = { value: true };
      const invalid =
        kind === 'large'
          ? new Array(501).fill(shared)
          : kind === 'sparse'
            ? new Array(1)
            : kind === 'nonplain'
              ? new Date()
              : kind === 'deep'
                ? { a: { a: { a: { a: { a: { a: { a: true } } } } } } }
                : kind === 'cyclic'
                  ? Object.assign(shared, { self: shared })
                  : kind === 'string'
                    ? 'x'.repeat(100_001)
                    : new Array(500).fill(new Array(500).fill(shared));
      const runtime = createRuntime(initialSnapshot());
      expect(runtime.ingest(started(2))).toBe('buffered');
      const before = runtime.getSnapshot();
      expect(() => runtime.replaceSnapshot({ ...initialSnapshot(), messages: invalid })).toThrow(
        'bounded plain runtime data',
      );
      expect(runtime.getSnapshot()).toBe(before);
      expect(runtime.ingest(started())).toBe('applied');
      const run = runtime.getSnapshot().run;
      expect(runtime.ingest({ ...started(3), payload: invalid })).toBe('rejected');
      expect(runtime.getSnapshot().run).toBe(run);
      expect(runtime.getSnapshot().lastSequence).toBe(2);
      runtime.dispose();
    },
  );
  it('rejects array bounds before inspecting any contained data', () => {
    const reads = vi.fn(() => {
      throw new Error('Oversized array elements must not be inspected.');
    });
    const messages = new Array(501);
    Object.defineProperty(messages, 0, { enumerable: true, get: reads });
    expect(() => createRuntime({ ...initialSnapshot(), messages })).toThrow(
      'bounded plain runtime data',
    );
    expect(reads).not.toHaveBeenCalled();
  });
  it('accepts current collection, part and string maxima without freezing host data', () => {
    const message: MessageData = {
      id: 'message',
      role: 'assistant',
      state: 'complete',
      revision: Number.MAX_SAFE_INTEGER,
      parts: Array.from({ length: 100 }, (_, index) => ({
        id: `part-${index}`,
        type: 'text',
        format: 'plain',
        state: 'complete',
        text: 'x'.repeat(1000),
      })),
    };
    const snapshot: RuntimeSnapshot = {
      ...initialSnapshot(),
      schemaVersion: 2,
      messages: Array.from({ length: 500 }, (_, index) => ({ ...message, id: `message-${index}` })),
      steps: Array.from({ length: 200 }, (_, index) => ({
        id: `step-${index}`,
        label: 'x'.repeat(1000),
        state: 'queued',
        dependencyIds: Array.from({ length: 50 }, (_, dependency) => `step-${dependency}`),
      })),
      tools: Array.from({ length: 200 }, (_, index) => ({
        id: `tool-${index}`,
        name: 'Tool',
        state: 'queued',
        revision: 0,
        input: 'x'.repeat(100_000),
        output: 'x'.repeat(100_000),
      })),
      sources: Array.from({ length: 200 }, (_, index) => ({
        id: `source-${index}`,
        title: 'Source',
        version: 'v1',
        locator: 'p1',
        kind: 'document',
        access: 'available',
      })),
      artifacts: Array.from({ length: 100 }, (_, index) => ({
        id: `artifact-${index}`,
        title: 'Artifact',
        version: 0,
        kind: 'text',
        content: 'x'.repeat(100_000),
        sourceIds: Array.from({ length: 100 }, (_, source) => `source-${source}`),
      })),
    };
    const runtime = createRuntime(snapshot);
    expect(runtime.getSnapshot().messages).toHaveLength(500);
    expect(runtime.getSnapshot().messages[499]?.parts).toHaveLength(100);
    expect(runtime.getSnapshot().tools[199]?.output).toHaveLength(100_000);
    expect(runtime.getSnapshot().artifacts).toHaveLength(100);
    expect(Object.isFrozen(snapshot)).toBe(false);
    expect(Object.isFrozen(message.parts)).toBe(false);
    runtime.dispose();
    const eventRuntime = createRuntime({ ...initialSnapshot(), schemaVersion: 2 });
    expect(
      eventRuntime.ingest({
        ...started(),
        schemaVersion: 2,
        type: 'message.created',
        payload: message,
      }),
    ).toBe('applied');
    expect(eventRuntime.getSnapshot().messages[0]?.parts).toHaveLength(100);
    eventRuntime.dispose();
  });
});
describe('host decision validation', () => {
  const command = {
    commandId: 'command-1',
    proposalId: proposal.id,
    version: 1,
    actionDigest: proposal.actionDigest,
    decision: 'approve' as const,
  };
  it('binds version, digest, expiry and pending state', () => {
    expect(validateApprovalDecision(proposal, command, Date.parse('2026-09-29'))).toEqual({
      ok: true,
    });
    for (const changed of [
      { ...proposal, version: 2 },
      { ...proposal, actionDigest: 'changed' },
      { ...proposal, status: 'approved' as const },
      { ...proposal, expiresAt: '2020-01-01' },
    ])
      expect(validateApprovalDecision(changed, command, Date.now()).ok).toBe(false);
  });
  it('rejects executable, relative and credential-bearing URLs', () => {
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,test',
      '//example.com',
      '/path',
      'https://user:pass@example.com',
    ])
      expect(safeUrl(url)).toBeUndefined();
    expect(safeUrl('https://example.com/source')).toBe('https://example.com/source');
  });
});
