import { afterEach, describe, expect, it } from 'vitest';
import { createRuntime, messageText } from '@ai-interaction/core';
import type { MessageData, MessagePart, Runtime, TextMessagePart } from '@ai-interaction/core';
import { messageSchema, snapshotSchema } from '@ai-interaction/core/schema';

import { initialSnapshot, source } from '../../../apps/docs/lib/fixtures';

const closed: TextMessagePart = {
  id: 'intro',
  type: 'text',
  format: 'markdown',
  text: '**Completed** section.',
  state: 'complete',
};

const active: TextMessagePart = {
  id: 'answer',
  type: 'text',
  format: 'markdown',
  text: 'A partial',
  state: 'streaming',
};

const message = (parts: MessagePart[] = [closed, active]): MessageData => ({
  id: 'rich',
  role: 'assistant',
  state: 'streaming',
  revision: 0,
  parts,
});

const live: Runtime[] = [];

function runtime(value = message()) {
  const base = initialSnapshot();
  const result = createRuntime({
    ...base,
    schemaVersion: 2,
    run: { ...base.run, lifecycle: 'running' },
    messages: [value],
  });
  live.push(result);
  return result;
}

function event(
  store: Runtime,
  type: string,
  payload: unknown,
  sequence = store.getSnapshot().lastSequence + 1,
) {
  const snapshot = store.getSnapshot();
  return {
    schemaVersion: snapshot.schemaVersion,
    eventId: `event-${sequence}`,
    streamId: snapshot.streamId,
    sequence,
    runId: snapshot.run.id,
    threadId: snapshot.run.threadId,
    attemptId: snapshot.run.attemptId,
    occurredAt: '2026-09-30T00:00:00Z',
    type,
    payload,
  };
}

afterEach(() => {
  live.splice(0).forEach((store) => store.dispose());
});

describe('versioned structured messages', () => {
  it('appends only to the active part and retains completed parts by identity', () => {
    const store = runtime();
    const old = store.getSnapshot().messages[0]!.parts!;
    expect(
      store.ingest(
        event(store, 'message.part.delta', {
          id: 'rich',
          partId: 'answer',
          offset: 9,
          text: ' answer.',
        }),
      ),
    ).toBe('applied');
    const next = store.getSnapshot().messages[0]!;
    expect(next.parts?.[0]).toBe(old[0]);
    expect(next.parts?.[1]).not.toBe(old[1]);
    expect(next.revision).toBe(1);
    expect(Object.isFrozen(next.parts?.[1])).toBe(true);
    expect(messageText(next)).toBe('**Completed** section.\n\nA partial answer.');
    expect(
      store.ingest(event(store, 'message.part.completed', { id: 'rich', partId: 'answer' })),
    ).toBe('applied');
    expect(
      store.ingest(
        event(store, 'message.part.added', {
          id: 'rich',
          part: {
            id: 'citation',
            type: 'source',
            sourceId: source.id,
            version: source.version,
            locator: source.locator,
          },
        }),
      ),
    ).toBe('applied');
    expect(store.ingest(event(store, 'message.completed', { id: 'rich' }))).toBe('applied');
    expect(store.getSnapshot().messages[0]?.state).toBe('complete');
  });
  it.each([
    ['message.part.delta', { id: 'rich', partId: 'intro', offset: 0, text: 'rewrite' }],
    ['message.part.delta', { id: 'rich', partId: 'answer', offset: 0, text: 'wrong offset' }],
    ['message.delta', { id: 'rich', offset: 0, text: 'wrong representation' }],
    [
      'message.part.added',
      { id: 'rich', part: { id: 'file', type: 'attachment', attachmentId: 'file', version: '1' } },
    ],
    ['message.completed', { id: 'rich' }],
  ])('rejects invalid %s without mutating message content', (type, payload) => {
    const store = runtime();
    const previous = store.getSnapshot().messages;
    expect(store.ingest(event(store, type, payload))).toBe('rejected');
    expect(store.getSnapshot().messages).toBe(previous);
    expect(store.getSnapshot().stale).toBe(true);
  });
  it('buffers and deduplicates part deltas without duplicating text', () => {
    const store = runtime();
    const first = event(
      store,
      'message.part.delta',
      { id: 'rich', partId: 'answer', offset: 9, text: ' one' },
      1,
    );
    const second = event(
      store,
      'message.part.delta',
      { id: 'rich', partId: 'answer', offset: 13, text: ' two' },
      2,
    );
    expect(store.ingest(second)).toBe('buffered');
    expect(store.ingest(first)).toBe('applied');
    expect(store.ingest(first)).toBe('duplicate');
    expect(messageText(store.getSnapshot().messages[0]!)).toContain('A partial one two');
  });
  it('retains received parts on failure and on a terminal run', () => {
    const store = runtime();
    const previous = store.getSnapshot().messages[0]!.parts![0];
    expect(
      store.ingest(
        event(store, 'message.failed', {
          id: 'rich',
          error: { code: 'UPSTREAM_TIMEOUT', message: 'The host timed out.' },
        }),
      ),
    ).toBe('applied');
    expect(store.getSnapshot().messages[0]).toMatchObject({
      state: 'failed',
      error: { code: 'UPSTREAM_TIMEOUT' },
      parts: [{ state: 'complete' }, { state: 'interrupted', text: 'A partial' }],
    });
    expect(store.getSnapshot().messages[0]?.parts?.[0]).toBe(previous);
    const cancelled = runtime();
    expect(
      cancelled.ingest(
        event(cancelled, 'run.updated', {
          lifecycle: 'cancelled',
          version: cancelled.getSnapshot().run.version + 1,
        }),
      ),
    ).toBe('applied');
    expect(cancelled.getSnapshot().messages[0]).toMatchObject({
      state: 'interrupted',
      parts: [{ state: 'complete' }, { state: 'interrupted' }],
    });
  });
  it('requires explicit protocol v2 and forbids changing the protocol inside a stream', () => {
    expect(snapshotSchema.safeParse({ ...initialSnapshot(), messages: [message()] }).success).toBe(
      false,
    );
    const store = runtime();
    expect(store.ingest({ ...event(store, 'source.updated', source), schemaVersion: 1 })).toBe(
      'rejected',
    );
    expect(store.getSnapshot().diagnostic).toContain('Protocol version changed');
    expect(() => store.replaceSnapshot(initialSnapshot())).toThrow('Protocol version');
    store.replaceSnapshot({ ...initialSnapshot(), streamId: 'new-v1-stream' });
    expect(store.getSnapshot().schemaVersion).toBe(1);
  });
  it('validates exactly one bounded content representation and consistent lifecycle', () => {
    expect(messageSchema.safeParse({ ...message(), text: 'duplicate authority' }).success).toBe(
      false,
    );
    expect(messageSchema.safeParse(message([closed, closed])).success).toBe(false);
    expect(messageSchema.safeParse(message([active, closed])).success).toBe(false);
    expect(messageSchema.safeParse({ ...message(), state: 'complete' }).success).toBe(false);
    expect(messageSchema.safeParse({ ...message(), state: 'failed' }).success).toBe(false);
    expect(
      messageSchema.safeParse(
        message([
          { ...closed, text: 'x'.repeat(60_000) },
          { ...closed, id: 'two', text: 'y'.repeat(50_000) },
        ]),
      ).success,
    ).toBe(false);
    expect(
      messageSchema.safeParse(
        message(
          Array.from({ length: 101 }, (_, index) => ({
            id: `p${index}`,
            type: 'tool',
            toolCallId: 'tool',
          })),
        ),
      ).success,
    ).toBe(false);
  });
  it('rejects appended duplicate identities, message overflow and revision overflow', () => {
    const duplicate = runtime(message([closed]));
    expect(
      duplicate.ingest(event(duplicate, 'message.part.added', { id: 'rich', part: closed })),
    ).toBe('rejected');
    const big = runtime(message([{ ...active, text: 'x'.repeat(100_000) }]));
    expect(
      big.ingest(
        event(big, 'message.part.delta', {
          id: 'rich',
          partId: 'answer',
          offset: 100_000,
          text: 'x',
        }),
      ),
    ).toBe('rejected');
    const revision = runtime({ ...message(), revision: Number.MAX_SAFE_INTEGER });
    expect(
      revision.ingest(event(revision, 'message.part.completed', { id: 'rich', partId: 'answer' })),
    ).toBe('rejected');
    expect(revision.getSnapshot().diagnostic).toContain('revision limit');
  });
});
