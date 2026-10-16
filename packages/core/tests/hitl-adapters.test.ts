import { describe, expect, it } from 'vitest';
import {
  coerceFieldValues,
  fieldsFromSchema,
  fromAgUiInterrupt,
  fromMcpElicitation,
  readAgUiInterrupts,
  toAgUiResume,
  toMcpElicitationResult,
  validateApprovalDecision,
} from '@stackunseen/ui-core';

describe('flat schema to fields', () => {
  it('maps primitives and enums, keeps required and defaults, and reports the rest', () => {
    const { fields, unsupported } = fieldsFromSchema({
      type: 'object',
      properties: {
        quarter: { type: 'string', title: 'Quarter', enum: ['Q1', 'Q2'], default: 'Q1' },
        colour: {
          type: 'string',
          oneOf: [
            { const: '#f00', title: 'Red' },
            { const: '#0f0', title: 'Green' },
          ],
        },
        year: { type: 'integer', minimum: 2000, description: 'Fiscal year' },
        revenue: { type: 'number', default: 4.2 },
        notes: { type: 'string', maxLength: 2000 },
        agree: { type: 'boolean', default: false },
        tags: { type: 'array', items: { type: 'string', enum: ['a'] } },
        nested: { type: 'object', properties: {} },
        __proto__: { type: 'string' },
      },
      required: ['quarter', 'year'],
    });
    expect(fields).toEqual([
      {
        id: 'quarter',
        label: 'Quarter',
        type: 'select',
        required: true,
        options: [
          { value: 'Q1', label: 'Q1' },
          { value: 'Q2', label: 'Q2' },
        ],
        defaultValue: 'Q1',
      },
      {
        id: 'colour',
        label: 'colour',
        type: 'select',
        options: [
          { value: '#f00', label: 'Red' },
          { value: '#0f0', label: 'Green' },
        ],
      },
      {
        id: 'year',
        label: 'year',
        type: 'number',
        required: true,
        description: 'Fiscal year (at least 2000)',
        numeric: 'integer',
      },
      { id: 'revenue', label: 'revenue', type: 'number', numeric: 'number', defaultValue: '4.2' },
      { id: 'notes', label: 'notes', type: 'textarea' },
      { id: 'agree', label: 'agree', type: 'checkbox', defaultValue: false },
    ]);
    expect(unsupported.map((item) => item.path)).toEqual(['tags', 'nested']);
    expect(
      coerceFieldValues(fields, {
        quarter: 'Q2',
        year: '2026.7',
        revenue: '4.5',
        agree: true,
        notes: '',
      }),
    ).toEqual({
      quarter: 'Q2',
      year: 2026,
      revenue: 4.5,
      agree: true,
    });
    expect(fieldsFromSchema({ type: 'string' }).unsupported[0]?.message).toContain(
      'not a flat object',
    );
  });
});

describe('AG-UI interrupts', () => {
  const runFinished = {
    type: 'RUN_FINISHED',
    threadId: 'thread-2',
    runId: 'run-10',
    outcome: {
      type: 'interrupt',
      interrupts: [
        {
          id: 'int-email-edit',
          reason: 'tool_call',
          message: 'Send email to a@b.com? You can edit the body before approving.',
          toolCallId: 'tc-42',
          responseSchema: {
            type: 'object',
            properties: { approved: { type: 'boolean' }, editedArgs: { type: 'object' } },
            required: ['approved'],
          },
          expiresAt: '2030-01-01T00:00:00.000Z',
        },
        {
          id: 'int-form',
          reason: 'input_required',
          message: 'Please provide the quarterly filing details.',
          responseSchema: {
            type: 'object',
            properties: {
              quarter: { type: 'string', enum: ['Q1', 'Q2'] },
              year: { type: 'integer' },
            },
            required: ['quarter'],
          },
        },
        {
          id: 'int-custom',
          reason: 'langgraph:pick',
          message: 'Which branch?',
          responseSchema: {
            type: 'object',
            properties: { branch: { type: 'string', enum: ['main', 'dev'] } },
          },
        },
        { id: 'int-bare', reason: 'confirmation' },
        { bad: true },
      ],
    },
  };
  it('reads interrupts, builds version-bound approvals and forms, and falls back to a clarification', () => {
    const interrupts = readAgUiInterrupts(runFinished);
    expect(interrupts).toHaveLength(4);
    expect(readAgUiInterrupts({ type: 'RUN_FINISHED', runId: 'r' })).toEqual([]);
    const approval = fromAgUiInterrupt(interrupts[0]!, { runId: 'run-10' });
    expect(approval.kind).toBe('approval');
    if (approval.kind !== 'approval') throw new Error('expected approval');
    expect(approval.allowsEdits).toBe(true);
    expect(approval.expires).toBe(true);
    expect(approval.proposal).toMatchObject({
      id: 'int-email-edit',
      version: 1,
      runId: 'run-10',
      toolCallId: 'tc-42',
      target: 'Tool call tc-42',
      scopes: ['tool_call'],
      status: 'pending',
      expiresAt: '2030-01-01T00:00:00.000Z',
    });
    expect(approval.proposal.actionDigest).toMatch(/^agui-[0-9a-f]+$/);
    expect(
      validateApprovalDecision(
        approval.proposal,
        {
          commandId: 'c1',
          proposalId: 'int-email-edit',
          version: 1,
          actionDigest: approval.proposal.actionDigest,
          decision: 'approve',
        },
        Date.parse('2026-10-16T00:00:00Z'),
      ),
    ).toEqual({ ok: true });
    const form = fromAgUiInterrupt(interrupts[1]!, { runId: 'run-10' });
    expect(form).toMatchObject({
      kind: 'form',
      title: 'Please provide the quarterly filing details.',
    });
    if (form.kind !== 'form') throw new Error('expected form');
    expect(form.fields.map((field) => [field.id, field.type, !!field.required])).toEqual([
      ['quarter', 'select', true],
      ['year', 'number', false],
    ]);
    const custom = fromAgUiInterrupt(interrupts[2]!, { runId: 'run-10' });
    expect(custom).toEqual({
      kind: 'clarification',
      interruptId: 'int-custom',
      question: 'Which branch?',
      choices: [
        { value: 'main', label: 'main' },
        { value: 'dev', label: 'dev' },
      ],
      reason: 'langgraph:pick',
    });
    const bare = fromAgUiInterrupt(interrupts[3]!, { runId: 'run-10' });
    if (bare.kind !== 'approval') throw new Error('expected approval');
    expect(bare.expires).toBe(false);
    expect(bare.proposal.title).toBe('Confirm to continue');
  });

  it('writes resume entries with denials inside the payload and edits only when allowed', () => {
    const interrupts = readAgUiInterrupts(runFinished);
    const approval = fromAgUiInterrupt(interrupts[0]!, { runId: 'run-10' });
    const bare = fromAgUiInterrupt(interrupts[3]!, { runId: 'run-10' });
    const form = fromAgUiInterrupt(interrupts[1]!, { runId: 'run-10' });
    const custom = fromAgUiInterrupt(interrupts[2]!, { runId: 'run-10' });
    expect(
      toAgUiResume(approval, {
        kind: 'approval',
        decision: 'approve',
        editedArgs: { to: 'a@b.com' },
      }),
    ).toEqual({
      interruptId: 'int-email-edit',
      status: 'resolved',
      payload: { approved: true, editedArgs: { to: 'a@b.com' } },
    });
    expect(toAgUiResume(approval, { kind: 'approval', decision: 'reject' })).toEqual({
      interruptId: 'int-email-edit',
      status: 'resolved',
      payload: { approved: false },
    });
    expect(
      toAgUiResume(bare, { kind: 'approval', decision: 'approve', editedArgs: { x: 1 } }),
    ).toEqual({ interruptId: 'int-bare', status: 'resolved', payload: { approved: true } });
    expect(toAgUiResume(form, { kind: 'form', values: { quarter: 'Q1', year: '2026' } })).toEqual({
      interruptId: 'int-form',
      status: 'resolved',
      payload: { quarter: 'Q1', year: 2026 },
    });
    expect(toAgUiResume(custom, { kind: 'clarification', answer: 'dev', key: 'branch' })).toEqual({
      interruptId: 'int-custom',
      status: 'resolved',
      payload: { branch: 'dev' },
    });
    expect(toAgUiResume(form, { kind: 'cancel' })).toEqual({
      interruptId: 'int-form',
      status: 'cancelled',
    });
    expect(toAgUiResume(form, { kind: 'approval', decision: 'approve' })).toEqual({
      interruptId: 'int-form',
      status: 'cancelled',
    });
  });
});

describe('MCP elicitation', () => {
  it('reads form and url modes, keeps the url host visible, and refuses what it cannot show', () => {
    const form = fromMcpElicitation(
      {
        message: 'Please provide your contact information',
        requestedSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Your full name' },
            age: { type: 'number', minimum: 18 },
          },
          required: ['name'],
        },
      },
      { serverName: 'CRM' },
    );
    expect(form).toMatchObject({
      kind: 'form',
      serverName: 'CRM',
      message: 'Please provide your contact information',
    });
    if (form.kind !== 'form') throw new Error('expected form');
    expect(form.fields.map((field) => field.id)).toEqual(['name', 'age']);
    expect(
      toMcpElicitationResult(form, { action: 'accept', values: { name: 'Mona', age: '30' } }),
    ).toEqual({ action: 'accept', content: { name: 'Mona', age: 30 } });
    expect(toMcpElicitationResult(form, { action: 'decline' })).toEqual({ action: 'decline' });
    const url = fromMcpElicitation(
      {
        mode: 'url',
        message: 'Provide your API key',
        url: 'https://mcp.example.com/ui/set_api_key',
        elicitationId: 'e-1',
      },
      { serverName: 'CRM' },
    );
    expect(url).toEqual({
      kind: 'url',
      serverName: 'CRM',
      message: 'Provide your API key',
      url: 'https://mcp.example.com/ui/set_api_key',
      host: 'mcp.example.com',
      elicitationId: 'e-1',
    });
    expect(toMcpElicitationResult(url, { action: 'accept' })).toEqual({ action: 'accept' });
    expect(
      fromMcpElicitation(
        { mode: 'url', message: 'x', url: 'http://plain.example', elicitationId: 'e' },
        { serverName: 'CRM' },
      ),
    ).toMatchObject({ kind: 'unsupported', reason: 'URL elicitation must use https' });
    expect(
      fromMcpElicitation(
        { mode: 'url', message: 'x', url: 'https://ok.example' },
        { serverName: 'CRM' },
      ),
    ).toMatchObject({ kind: 'unsupported' });
    expect(
      fromMcpElicitation({ mode: 'voice', message: 'x' }, { serverName: 'CRM' }),
    ).toMatchObject({ kind: 'unsupported', reason: 'Mode "voice" is not read' });
    expect(fromMcpElicitation(null, { serverName: 'CRM' })).toMatchObject({ kind: 'unsupported' });
  });
});
