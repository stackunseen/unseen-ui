import { describe, expect, it, vi } from 'vitest';
import {
  historyScopeKey,
  inspectConversationHistory,
  inspectHistoryRestore,
} from '@stackunseen/ui-core/history';
import type { MessageData } from '@stackunseen/ui-core';
import { context, row, history } from '../../../tests/fixtures/conversation-history.js';

describe('bounded chronological history', () => {
  it('copies a valid window without freezing host-owned mutable objects', () => {
    const input = history(),
      result = inspectConversationHistory(input)!;
    expect(result).toEqual(input);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.messages[0])).toBe(true);
    expect(Object.isFrozen(input.messages[0])).toBe(false);
    (input.messages[0] as { text: string }).text = 'Changed';
    expect(inspectConversationHistory(input)?.messages[0]?.text).toBe('Changed');
    expect(result.messages[0]?.text).toBe('Public message m');
  });

  it('reuses fully frozen windows and unchanged frozen rows safely', () => {
    const messages = Object.freeze([Object.freeze(row())]);
    const first = Object.freeze(
      history({
        context: Object.freeze({ ...context }),
        messages,
        older: Object.freeze({ state: 'end' as const }),
        newer: Object.freeze({ state: 'end' as const }),
      }),
    );
    const result = inspectConversationHistory(first)!;
    expect(inspectConversationHistory(first)).toBe(result);
    const next = inspectConversationHistory(history({ messages }));
    expect(next?.messages[0]).toBe(result.messages[0]);
  });

  it.each([
    { messages: [row(), row()] },
    { context: { ...context, threadId: undefined } },
    { startIndex: 1 },
    { totalMessages: 0 },
    { totalMessages: 2 },
    { startIndex: Number.MAX_SAFE_INTEGER, older: { state: 'unknown' } },
    { older: { state: 'available' } },
    { older: { state: 'available', cursor: 'before-first' } },
    { newer: { state: 'error', cursor: 'after-last' } },
    { newer: { state: 'unknown', cursor: 'guess' } },
    { messages: [{ ...row(), state: 'failed' }] },
    { messages: [{ ...row(), extra: 'unsafe' }] },
  ])('rejects inconsistent scope/data/edge metadata %j', (changes) => {
    expect(inspectConversationHistory({ ...history(), ...changes })).toBeUndefined();
  });

  it('bounds aggregate data and never truncates an excessive window', () => {
    const messages = Array.from({ length: 10_001 }, (_, i) => row(String(i)));
    expect(
      inspectConversationHistory(history({ messages, totalMessages: messages.length })),
    ).toBeUndefined();
    const large = Array.from({ length: 51 }, (_, i) => ({
      ...row(String(i)),
      text: 'x'.repeat(100_000),
    }));
    expect(
      inspectConversationHistory(history({ messages: large, totalMessages: large.length })),
    ).toBeUndefined();
  });

  it('rejects getters, sparse arrays, cycles and nested unfrozen mutations', () => {
    const getter = vi.fn(() => 'secret'),
      input = history();
    Object.defineProperty(input, 'messages', { get: getter, enumerable: true });
    expect(inspectConversationHistory(input)).toBeUndefined();
    expect(getter).not.toHaveBeenCalled();
    expect(
      inspectConversationHistory(history({ messages: new Array(2), totalMessages: 2 })),
    ).toBeUndefined();
    const part = {
      id: 'p',
      type: 'text' as const,
      format: 'plain' as const,
      text: 'First',
      state: 'complete' as const,
    };
    const message = Object.freeze({
      id: 'parts',
      role: 'assistant' as const,
      state: 'complete' as const,
      revision: 0,
      parts: [part],
    });
    expect(
      inspectConversationHistory(history({ messages: [message] }))?.messages[0]?.parts?.[0],
    ).toMatchObject({ text: 'First' });
    part.text = 'Second';
    expect(
      inspectConversationHistory(history({ messages: [message] }))?.messages[0]?.parts?.[0],
    ).toMatchObject({ text: 'Second' });
    const cyclic: Record<string, unknown> = { ...row() };
    cyclic.text = cyclic;
    expect(
      inspectConversationHistory(history({ messages: [cyclic as unknown as MessageData] })),
    ).toBeUndefined();
  });

  it('accepts unknown totals and explicit older/newer cursor windows', () => {
    expect(
      inspectConversationHistory(
        history({
          startIndex: undefined,
          totalMessages: undefined,
          older: { state: 'unknown' },
          newer: { state: 'unknown' },
        }),
      ),
    ).toBeDefined();
    expect(
      inspectConversationHistory(
        history({
          startIndex: 5,
          totalMessages: 100,
          older: { state: 'available', cursor: 'opaque-before' },
          newer: { state: 'error', cursor: 'opaque-after', detail: 'Host unavailable.' },
        }),
      ),
    ).toBeDefined();
  });

  it('separates stable reading scope from exact restoration scope', () => {
    expect(historyScopeKey(context)).toBe(historyScopeKey({ ...context, version: '2' }));
    expect(historyScopeKey(context)).not.toBe(historyScopeKey({ ...context, threadId: 'other' }));
    expect(
      inspectHistoryRestore({ requestId: 'r', context, messageId: 'm', inset: 20 }),
    ).toBeDefined();
    expect(
      inspectHistoryRestore({ requestId: 'r', context, messageId: 'm', inset: -1 }),
    ).toBeUndefined();
  });
});
