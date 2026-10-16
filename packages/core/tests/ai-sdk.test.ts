import { describe, expect, it } from 'vitest';
import { fromAiSdkChat } from '@stackunseen/ui-core/ai-sdk';
import type { AiSdkMessage } from '@stackunseen/ui-core/ai-sdk';

const user: AiSdkMessage = {
  id: 'u1',
  role: 'user',
  parts: [{ type: 'text', text: 'Archive inactive accounts' }],
};

function assistant(parts: AiSdkMessage['parts']): AiSdkMessage {
  return { id: 'a1', role: 'assistant', parts };
}

describe('fromAiSdkChat', () => {
  it('maps text, sources and files, and leaves reasoning out', () => {
    const state = fromAiSdkChat({
      status: 'ready',
      messages: [
        user,
        assistant([
          { type: 'step-start' },
          { type: 'reasoning', text: 'private chain of thought', state: 'done' },
          { type: 'text', text: '**Three** accounts qualify.', state: 'done' },
          {
            type: 'source-url',
            sourceId: 's1',
            url: 'https://example.com/policy',
            title: 'Policy',
          },
          {
            type: 'source-url',
            sourceId: 's1',
            url: 'https://example.com/policy',
            title: 'Policy',
          },
          { type: 'file', mediaType: 'text/csv', filename: 'accounts.csv', url: 'blob:x' },
        ]),
      ],
    });
    expect(state.status).toBe('complete');
    expect(state.messages[0]).toMatchObject({ role: 'user', state: 'complete' });
    const reply = state.messages[1]!;
    expect(reply.parts?.map((part) => part.type)).toEqual([
      'text',
      'source',
      'source',
      'unsupported',
    ]);
    expect(JSON.stringify(reply)).not.toContain('private chain of thought');
    expect(reply.parts?.[0]).toMatchObject({ format: 'markdown', state: 'complete' });
    expect(state.sources).toEqual([
      expect.objectContaining({
        id: 's1',
        title: 'Policy',
        kind: 'web',
        url: 'https://example.com/policy',
      }),
    ]);
  });

  it('marks only a trailing assistant reply as streaming', () => {
    const streaming = fromAiSdkChat({
      status: 'streaming',
      messages: [user, assistant([{ type: 'text', text: 'Work', state: 'streaming' }])],
    });
    expect(streaming.status).toBe('streaming');
    expect(streaming.messages[1]).toMatchObject({ state: 'streaming' });
    const submitted = fromAiSdkChat({
      status: 'submitted',
      messages: [
        assistant([{ type: 'text', text: 'Earlier reply', state: 'done' }]),
        { ...user, id: 'u2' },
      ],
    });
    expect(submitted.status).toBe('streaming');
    expect(submitted.messages[0]).toMatchObject({ state: 'complete' });
  });

  it('keeps the error on the failed reply', () => {
    const state = fromAiSdkChat({
      status: 'error',
      error: { message: 'Rate limited' },
      messages: [user, assistant([{ type: 'text', text: 'Part', state: 'streaming' }])],
    });
    expect(state.status).toBe('failed');
    expect(state.messages[1]).toMatchObject({
      state: 'failed',
      error: { message: 'Rate limited' },
    });
  });

  it('maps every tool state, including dynamic tools and bounded JSON', () => {
    const big = 'x'.repeat(50);
    const state = fromAiSdkChat(
      {
        status: 'ready',
        messages: [
          assistant([
            {
              type: 'tool-search',
              toolCallId: 't1',
              state: 'input-streaming',
              input: { q: 'ren' },
            },
            {
              type: 'tool-search',
              toolCallId: 't2',
              state: 'input-available',
              input: { q: 'renewals' },
            },
            {
              type: 'tool-search',
              toolCallId: 't3',
              state: 'output-available',
              input: {},
              output: { hits: 3 },
            },
            {
              type: 'tool-search',
              toolCallId: 't4',
              state: 'output-error',
              input: {},
              errorText: 'Timeout',
            },
            {
              type: 'dynamic-tool',
              toolName: 'lookup',
              toolCallId: 't5',
              state: 'output-available',
              input: {},
              output: big,
            },
          ]),
        ],
      },
      { maxJsonLength: 20 },
    );
    expect(state.tools.map((tool) => [tool.name, tool.state])).toEqual([
      ['search', 'input-streaming'],
      ['search', 'running'],
      ['search', 'succeeded'],
      ['search', 'failed'],
      ['lookup', 'succeeded'],
    ]);
    expect(state.tools[2]!.output).toBe('{\n  "hits": 3\n}');
    expect(state.tools[3]!.error).toBe('Timeout');
    expect(state.tools[4]!.output).toHaveLength(20);
    expect(state.approvals).toEqual([]);
  });

  it('shows no card for an approval a server rule decided', () => {
    const state = fromAiSdkChat({
      status: 'ready',
      messages: [
        assistant([
          {
            type: 'tool-deploy',
            toolCallId: 't9',
            state: 'approval-responded',
            input: { target: 'staging' },
            approval: { id: 'ap9', approved: true, isAutomatic: true },
          },
        ]),
      ],
    });
    expect(state.approvals).toEqual([]);
    expect(state.tools[0]!.state).toBe('running');
  });

  it('builds approval cards that say what is not supplied and settle with the tool', () => {
    const requested = fromAiSdkChat({
      status: 'ready',
      messages: [
        assistant([
          {
            type: 'tool-archive',
            toolCallId: 't1',
            state: 'approval-requested',
            input: { ids: [1, 2, 3] },
            approval: { id: 'ap1', requestReason: 'Archiving hides 3 accounts.' },
          },
        ]),
      ],
    });
    const [approval] = requested.approvals;
    expect(requested.tools[0]!.state).toBe('approval-required');
    expect(approval).toMatchObject({
      toolCallId: 't1',
      approvalId: 'ap1',
      submission: 'idle',
      proposal: {
        id: 'ap1',
        title: 'Run archive',
        impact: 'Archiving hides 3 accounts.',
        risk: 'unknown',
        expiresAt: '',
        status: 'pending',
        scopes: [],
      },
    });
    expect(approval!.proposal.actionDigest).toMatch(/^archive:[0-9a-f]{8}$/);

    const responded = fromAiSdkChat({
      status: 'submitted',
      messages: [
        assistant([
          {
            type: 'tool-archive',
            toolCallId: 't1',
            state: 'approval-responded',
            input: { ids: [1] },
            approval: { id: 'ap1', approved: true },
          },
          {
            type: 'tool-mail',
            toolCallId: 't2',
            state: 'approval-responded',
            input: {},
            approval: { id: 'ap2', approved: false },
          },
        ]),
      ],
    });
    expect(responded.approvals.map((a) => [a.proposal.status, a.submission])).toEqual([
      ['approved', 'submitting'],
      ['rejected', 'submitting'],
    ]);
    expect(responded.tools.map((tool) => tool.state)).toEqual(['running', 'denied']);

    const settled = fromAiSdkChat(
      {
        status: 'ready',
        messages: [
          assistant([
            {
              type: 'tool-archive',
              toolCallId: 't1',
              state: 'output-available',
              input: {},
              output: 'done',
              approval: { id: 'ap1', approved: true },
            },
            {
              type: 'tool-mail',
              toolCallId: 't2',
              state: 'output-denied',
              input: {},
              approval: { id: 'ap2', approved: false },
            },
          ]),
        ],
      },
      {
        describeApproval: ({ name }) => ({
          title: `Allow ${name}?`,
          risk: 'high',
          scopes: [`${name}:write`],
        }),
      },
    );
    expect(
      settled.approvals.map((a) => [
        a.proposal.title,
        a.proposal.risk,
        a.proposal.status,
        a.submission,
      ]),
    ).toEqual([
      ['Allow archive?', 'high', 'approved', 'acknowledged'],
      ['Allow mail?', 'high', 'rejected', 'acknowledged'],
    ]);
  });
});
