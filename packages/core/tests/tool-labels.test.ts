import { describe, expect, it } from 'vitest';
import { toolCallFrom } from '@stackunseen/ui-core';
import { fromAiSdkChat } from '@stackunseen/ui-core/ai-sdk';
import { eventSchema } from '../src/schema.js';

describe('tool row labels', () => {
  it('keep host-written label and target through the short form', () => {
    const call = toolCallFrom({
      name: 'search_accounts',
      label: 'Searched accounts',
      target: '90 days',
    });
    expect(call).toMatchObject({ label: 'Searched accounts', target: '90 days' });
    expect(toolCallFrom({ name: 'plain' })).not.toHaveProperty('label');
  });

  it('come from describeTool in the AI SDK mapping, and are absent without it', () => {
    const messages = [
      {
        id: 'a1',
        role: 'assistant' as const,
        parts: [
          {
            type: 'tool-search',
            toolCallId: 'c1',
            state: 'output-available',
            input: { query: 'renewals' },
            output: '3 notes',
          },
        ],
      },
    ];
    const described = fromAiSdkChat(
      { messages, status: 'ready' },
      {
        describeTool: ({ input }) => ({
          label: 'Searched notes',
          target: (input as { query: string }).query,
        }),
      },
    );
    expect(described.tools[0]).toMatchObject({ label: 'Searched notes', target: 'renewals' });
    expect(fromAiSdkChat({ messages, status: 'ready' }).tools[0]).not.toHaveProperty('label');
  });

  it('are accepted by the host event schema, bounded like other short text', () => {
    const event = {
      type: 'tool.updated',
      payload: {
        id: 't1',
        name: 'search',
        revision: 1,
        state: 'succeeded',
        input: '{}',
        label: 'Searched notes',
        target: 'renewals',
      },
    };
    const envelope = eventSchema.safeParse({ ...event });
    // The envelope fields are required elsewhere; only the payload shape matters here.
    const payloadErrors = envelope.success
      ? []
      : envelope.error.issues.filter((issue) => issue.path[0] === 'payload');
    expect(payloadErrors).toEqual([]);
    const long = eventSchema.safeParse({
      ...event,
      payload: { ...event.payload, label: 'x'.repeat(1001) },
    });
    expect(
      !long.success && long.error.issues.some((issue) => issue.path.join('.') === 'payload.label'),
    ).toBe(true);
  });
});
