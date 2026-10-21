import { describe, expect, it } from 'vitest';
import { fromAiSdkChat } from '../src/ai-sdk.js';
import { messageSchema } from '../src/message-schema.js';
import { messageFrom } from '../src/inputs.js';

describe('message authors for group chats', () => {
  it('maps metadata.author on user messages only, and drops malformed authors', () => {
    const { messages } = fromAiSdkChat({
      status: 'ready',
      messages: [
        {
          id: 'u1',
          role: 'user',
          parts: [{ type: 'text', text: 'Hi all' }],
          metadata: { author: { id: 'acc-1', name: '  Ana   Ruiz ', you: true } },
        },
        {
          id: 'u2',
          role: 'user',
          parts: [{ type: 'text', text: 'Hey' }],
          metadata: { author: { id: 'acc-2', name: 'Ben' } },
        },
        {
          id: 'u3',
          role: 'user',
          parts: [{ type: 'text', text: 'Odd' }],
          metadata: { author: { id: 7, name: 'X' } },
        },
        {
          id: 'a1',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Hello' }],
          metadata: { author: { id: 'bot', name: 'Bot' } },
        },
      ],
    });
    expect(messages.map((message) => message.author)).toEqual([
      { id: 'acc-1', name: 'Ana Ruiz', you: true },
      { id: 'acc-2', name: 'Ben' },
      undefined,
      undefined,
    ]);
    for (const message of messages) expect(messageSchema.safeParse(message).success).toBe(true);
  });

  it('validates the author shape and keeps it in the short form', () => {
    const base = {
      id: 'm',
      role: 'user' as const,
      text: 'Hi',
      state: 'complete' as const,
      revision: 0,
    };
    expect(messageSchema.safeParse({ ...base, author: { id: 'a', name: 'Ana' } }).success).toBe(
      true,
    );
    expect(messageSchema.safeParse({ ...base, author: { id: 'a', name: '' } }).success).toBe(false);
    expect(
      messageSchema.safeParse({ ...base, author: { id: 'a', name: 'Ana', role: 'admin' } }).success,
    ).toBe(false);
    expect(
      messageFrom({ role: 'user', text: 'Hi', author: { id: 'a', name: 'Ana' } }).author,
    ).toEqual({ id: 'a', name: 'Ana' });
  });
});

describe('tool calls cut off by Stop', () => {
  it('reads as cancelled once the chat is idle, and running while it is busy', () => {
    const message = {
      id: 'a1',
      role: 'assistant' as const,
      parts: [
        { type: 'tool-canvas', toolCallId: 'c1', state: 'input-streaming', input: { title: 'Dr' } },
      ],
    };
    expect(fromAiSdkChat({ status: 'ready', messages: [message] }).tools[0]!.state).toBe(
      'cancelled',
    );
    expect(fromAiSdkChat({ status: 'streaming', messages: [message] }).tools[0]!.state).toBe(
      'input-streaming',
    );
  });
});
