import { describe, expect, it } from 'vitest';
import {
  createLocalHost,
  defaultLocalReply,
  messageFrom,
  toolCallFrom,
} from '@stackunseen/ui-core';

/** A manual clock so the host streams only when the test says so. */
function manualSchedule() {
  const queue: { fn: () => void; cancelled: boolean }[] = [];
  return {
    schedule(fn: () => void) {
      const entry = { fn, cancelled: false };
      queue.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
    run(times = 1) {
      for (let i = 0; i < times; i++) {
        const entry = queue.shift();
        if (!entry) return;
        if (!entry.cancelled) entry.fn();
      }
    },
    flush(limit = 1000) {
      let n = 0;
      while (queue.length && n++ < limit) this.run();
    },
  };
}

describe('createLocalHost', () => {
  it('streams a reply a few characters at a time and completes with suggestions', () => {
    const clock = manualSchedule();
    const host = createLocalHost({
      schedule: clock.schedule,
      charsPerTick: 5,
      now: () => '2026-10-16T10:00:00.000Z',
      reply: () => ({ text: 'Hello there', suggestions: ['More'] }),
    });
    let notified = 0;
    host.subscribe(() => notified++);
    expect(host.send('  ')).toBe(false);
    expect(host.send('hi')).toBe(true);
    let snap = host.getSnapshot();
    expect(snap.status).toBe('streaming');
    expect(snap.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(snap.messages[0]).toMatchObject({
      text: 'hi',
      state: 'complete',
      createdAt: '2026-10-16T10:00:00.000Z',
    });
    expect(host.send('again')).toBe(false);
    clock.run();
    snap = host.getSnapshot();
    expect(snap.messages[1]).toMatchObject({ text: 'Hello', state: 'streaming', revision: 1 });
    clock.flush();
    snap = host.getSnapshot();
    expect(snap.messages[1]).toMatchObject({ text: 'Hello there', state: 'complete' });
    expect(snap.status).toBe('complete');
    expect(snap.suggestions).toEqual(['More']);
    expect(notified).toBeGreaterThan(3);
  });

  it('runs a tool before the text, cancels cleanly and retries the same prompt', () => {
    const clock = manualSchedule();
    const host = createLocalHost({ schedule: clock.schedule, charsPerTick: 100 });
    host.send('search notes for renewals');
    let snap = host.getSnapshot();
    expect(snap.tools).toHaveLength(1);
    expect(snap.tools[0]).toMatchObject({ name: 'search_notes', state: 'running' });
    expect(snap.messages[1]!.parts?.[0]).toMatchObject({
      type: 'tool',
      toolCallId: snap.tools[0]!.id,
    });
    clock.run(3);
    host.cancel();
    snap = host.getSnapshot();
    expect(snap.status).toBe('cancelled');
    expect(snap.tools[0]!.state).toBe('cancelled');
    expect(snap.messages[1]!.state).toBe('interrupted');
    host.retry();
    snap = host.getSnapshot();
    expect(snap.messages).toHaveLength(2);
    expect(snap.messages[0]!.text).toBe('search notes for renewals');
    expect(snap.status).toBe('streaming');
    clock.flush();
    snap = host.getSnapshot();
    expect(snap.status).toBe('complete');
    expect(snap.tools.at(-1)).toMatchObject({
      state: 'succeeded',
      output: expect.stringContaining('3 notes matched'),
    });
    const text = snap.messages[1]!.parts?.find((p) => p.type === 'text');
    expect(text && text.type === 'text' ? text.text : '').toContain('simulated reply');
  });

  it('fails part way when the reply asks for it and keeps the partial text', () => {
    const clock = manualSchedule();
    const host = createLocalHost({ schedule: clock.schedule, charsPerTick: 3 });
    host.send('please fail');
    clock.flush();
    const snap = host.getSnapshot();
    expect(snap.status).toBe('failed');
    expect(snap.messages[1]!.state).toBe('failed');
    expect(snap.messages[1]!.error?.code).toBe('simulated-failure');
    expect((snap.messages[1]!.text ?? '').length).toBeGreaterThan(0);
    expect(snap.lastPrompt).toBe('please fail');
  });

  it('bounds the transcript and resets', () => {
    const clock = manualSchedule();
    const host = createLocalHost({
      schedule: clock.schedule,
      maxMessages: 4,
      charsPerTick: 100,
      reply: () => 'ok',
    });
    for (const prompt of ['a', 'b', 'c']) {
      host.send(prompt);
      clock.flush();
    }
    expect(host.getSnapshot().messages).toHaveLength(4);
    expect(host.getSnapshot().messages[0]!.text).toBe('b');
    host.reset();
    expect(host.getSnapshot()).toMatchObject({ messages: [], tools: [], status: 'idle' });
  });

  it('default replies say they are simulated', () => {
    expect(defaultLocalReply('what is this').text).toContain('simulated');
    expect(defaultLocalReply('summarize the plan').text).toContain(
      'Nothing here came from a model',
    );
    expect(defaultLocalReply('find renewals').tool?.name).toBe('search_notes');
  });
});

describe('short-form inputs', () => {
  it('fills tool call defaults and infers the state from what is present', () => {
    expect(toolCallFrom({ name: 'search' })).toEqual({
      id: 'search',
      name: 'search',
      revision: 1,
      state: 'running',
      input: '',
    });
    expect(toolCallFrom({ name: 'search', output: 'done' }).state).toBe('succeeded');
    expect(toolCallFrom({ name: 'search', error: 'nope' }).state).toBe('failed');
    const full = { id: 't1', name: 'search', revision: 3, state: 'queued' as const, input: '{}' };
    expect(toolCallFrom(full)).toEqual(full);
  });

  it('fills message defaults and passes host messages through', () => {
    expect(messageFrom({ role: 'user', text: 'hi' })).toEqual({
      id: 'user-message',
      role: 'user',
      text: 'hi',
      state: 'complete',
      revision: 0,
    });
    const full = {
      id: 'm',
      role: 'assistant' as const,
      text: 'x',
      state: 'streaming' as const,
      revision: 2,
    };
    expect(messageFrom(full)).toBe(full);
  });
});
