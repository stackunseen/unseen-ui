/**
 * Normalisers for two human-in-the-loop protocols, read on 2026-10-16:
 * AG-UI interrupts (RunFinished outcome `{ type: 'interrupt', interrupts }` and the `resume` array)
 * and MCP elicitation (`elicitation/create` with a flat primitive JSON Schema, answered with
 * accept, decline or cancel). Each maps onto the shapes ApprovalCard, ClarificationRequest and
 * AIForm already take, and maps decisions back. Nothing here sends anything; the host does.
 */
import type { ApprovalProposal } from './types.js';

export interface HitlFieldOption {
  value: string;
  label: string;
}
/** The subset of AIForm's field definition that a flat JSON Schema can express. */
export interface HitlField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox';
  required?: boolean;
  description?: string;
  options?: HitlFieldOption[];
  /** Where the schema said number or integer; used when values go back. */
  numeric?: 'number' | 'integer';
  defaultValue?: string | boolean;
}
export interface HitlUnsupported {
  path: string;
  message: string;
}
export interface SchemaFields {
  fields: HitlField[];
  unsupported: HitlUnsupported[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.slice(0, 200) : fallback;
}
function identifier(value: string): string {
  return value.trim().slice(0, 80) || 'field';
}

/**
 * Flat object schema with primitive properties (string, number, integer, boolean, string enums
 * with or without titles) to AIForm-style fields. Anything else is reported, not guessed.
 */
export function fieldsFromSchema(schema: unknown, limit = 50): SchemaFields {
  const unsupported: HitlUnsupported[] = [];
  if (
    !isRecord(schema) ||
    (schema.type !== undefined && schema.type !== 'object') ||
    !isRecord(schema.properties)
  )
    return {
      fields: [],
      unsupported: [{ path: '', message: 'Schema is not a flat object with properties' }],
    };
  const required = new Set(
    Array.isArray(schema.required)
      ? schema.required.filter((item): item is string => typeof item === 'string')
      : [],
  );
  const fields: HitlField[] = [];
  for (const [key, raw] of Object.entries(schema.properties)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
    if (fields.length >= limit) {
      unsupported.push({ path: key, message: `More than ${limit} fields` });
      continue;
    }
    if (!isRecord(raw)) {
      unsupported.push({ path: key, message: 'Property is not a schema object' });
      continue;
    }
    const id = identifier(key);
    const label = text(raw.title, key);
    const description =
      typeof raw.description === 'string' ? raw.description.slice(0, 2000) : undefined;
    const base: HitlField = { id, label, type: 'text' };
    if (required.has(key)) base.required = true;
    if (description) base.description = description;
    const options = enumOptions(raw);
    if (options) {
      if (options.length < 1) {
        unsupported.push({ path: key, message: 'Empty enum' });
        continue;
      }
      fields.push({
        ...base,
        type: 'select',
        options,
        ...(typeof raw.default === 'string' ? { defaultValue: raw.default } : {}),
      });
      continue;
    }
    switch (raw.type) {
      case 'string': {
        const long = typeof raw.maxLength === 'number' && raw.maxLength > 200;
        fields.push({
          ...base,
          type: long ? 'textarea' : 'text',
          ...(typeof raw.default === 'string' ? { defaultValue: raw.default } : {}),
        });
        break;
      }
      case 'number':
      case 'integer': {
        const bounds = [
          typeof raw.minimum === 'number' ? `at least ${raw.minimum}` : undefined,
          typeof raw.maximum === 'number' ? `at most ${raw.maximum}` : undefined,
        ]
          .filter(Boolean)
          .join(', ');
        fields.push({
          ...base,
          type: 'number',
          numeric: raw.type,
          ...(bounds ? { description: description ? `${description} (${bounds})` : bounds } : {}),
          ...(typeof raw.default === 'number' ? { defaultValue: String(raw.default) } : {}),
        });
        break;
      }
      case 'boolean':
        fields.push({
          ...base,
          type: 'checkbox',
          ...(typeof raw.default === 'boolean' ? { defaultValue: raw.default } : {}),
        });
        break;
      case 'array':
        unsupported.push({
          path: key,
          message: 'Multiple selection is not supported; ask for one choice',
        });
        break;
      default:
        unsupported.push({
          path: key,
          message: `Type "${text(raw.type, 'unknown')}" is not a flat primitive`,
        });
    }
  }
  return { fields, unsupported };
}
function enumOptions(schema: Record<string, unknown>): HitlFieldOption[] | undefined {
  if (Array.isArray(schema.enum))
    return schema.enum
      .filter((item): item is string => typeof item === 'string')
      .map((value) => ({ value, label: value }));
  if (Array.isArray(schema.oneOf)) {
    const options = schema.oneOf
      .filter(isRecord)
      .filter((item) => typeof item.const === 'string')
      .map((item) => ({
        value: item.const as string,
        label: text(item.title, item.const as string),
      }));
    return options.length ? options : [];
  }
  return undefined;
}
/** Converts submitted string/boolean values back to the types the schema asked for. */
export function coerceFieldValues(
  fields: readonly HitlField[],
  values: Record<string, string | boolean>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const field of fields) {
    const value = values[field.id];
    if (value === undefined || value === '') continue;
    if (field.type === 'checkbox') out[field.id] = value === true || value === 'true';
    else if (field.type === 'number') {
      const number = Number(value);
      if (Number.isFinite(number))
        out[field.id] = field.numeric === 'integer' ? Math.trunc(number) : number;
    } else out[field.id] = String(value);
  }
  return out;
}

// ---------- AG-UI interrupts ----------

export interface AgUiInterrupt {
  id: string;
  reason: string;
  message?: string;
  toolCallId?: string;
  responseSchema?: unknown;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
  subagentRunId?: string;
}
export type HitlRequest =
  | {
      kind: 'approval';
      interruptId: string;
      proposal: ApprovalProposal;
      /** The response schema offers editedArgs, so the host may let the person edit the arguments. */
      allowsEdits: boolean;
      /** False when the interrupt carried no expiry; the proposal's expiresAt is then a far placeholder. */
      expires: boolean;
      subagentRunId?: string;
    }
  | {
      kind: 'form';
      interruptId: string;
      title: string;
      fields: HitlField[];
      unsupported: HitlUnsupported[];
      expiresAt?: string;
      subagentRunId?: string;
    }
  | {
      kind: 'clarification';
      interruptId: string;
      question: string;
      choices?: HitlFieldOption[];
      reason: string;
      expiresAt?: string;
      subagentRunId?: string;
    };

const farFuture = '9999-12-31T23:59:59.000Z';
function digest(parts: readonly unknown[]): string {
  let hash = 5381;
  const input = JSON.stringify(parts);
  for (let index = 0; index < input.length; index++)
    hash = ((hash << 5) + hash + input.charCodeAt(index)) >>> 0;
  return `agui-${hash.toString(16)}`;
}
/** Pull the interrupts out of a RunFinished event; legacy events without an outcome yield none. */
export function readAgUiInterrupts(event: unknown): AgUiInterrupt[] {
  if (
    !isRecord(event) ||
    !isRecord(event.outcome) ||
    event.outcome.type !== 'interrupt' ||
    !Array.isArray(event.outcome.interrupts)
  )
    return [];
  return event.outcome.interrupts.filter(
    (item): item is AgUiInterrupt =>
      isRecord(item) && typeof item.id === 'string' && typeof item.reason === 'string',
  );
}
export function fromAgUiInterrupt(
  interrupt: AgUiInterrupt,
  context: { runId: string },
): HitlRequest {
  const schema = isRecord(interrupt.responseSchema) ? interrupt.responseSchema : undefined;
  const properties = schema && isRecord(schema.properties) ? schema.properties : undefined;
  const message = text(interrupt.message, '');
  const common = {
    interruptId: interrupt.id,
    ...(interrupt.subagentRunId ? { subagentRunId: interrupt.subagentRunId } : {}),
  };
  if (interrupt.reason === 'tool_call' || interrupt.reason === 'confirmation') {
    const allowsEdits = !!properties && isRecord(properties.editedArgs);
    const proposal: ApprovalProposal = {
      id: interrupt.id,
      version: 1,
      runId: context.runId,
      toolCallId: interrupt.toolCallId ?? interrupt.id,
      actionDigest: digest([
        interrupt.id,
        interrupt.toolCallId,
        interrupt.message,
        interrupt.reason,
      ]),
      title:
        message ||
        (interrupt.reason === 'tool_call' ? 'Approve this tool call' : 'Confirm to continue'),
      target: interrupt.toolCallId ? `Tool call ${interrupt.toolCallId}` : `Run ${context.runId}`,
      scopes: [interrupt.reason],
      impact: message || 'The agent is waiting for your decision.',
      expiresAt:
        interrupt.expiresAt && Number.isFinite(Date.parse(interrupt.expiresAt))
          ? interrupt.expiresAt
          : farFuture,
      risk: 'medium',
      status: 'pending',
    };
    return {
      kind: 'approval',
      ...common,
      proposal,
      allowsEdits,
      expires: proposal.expiresAt !== farFuture,
    };
  }
  if (interrupt.reason === 'input_required' && schema) {
    const { fields, unsupported } = fieldsFromSchema(schema);
    return {
      kind: 'form',
      ...common,
      title: message || 'The agent needs more information',
      fields,
      unsupported,
      ...(interrupt.expiresAt ? { expiresAt: interrupt.expiresAt } : {}),
    };
  }
  // Unknown reasons render from the message; a single-enum schema becomes choices.
  const single =
    properties && Object.keys(properties).length === 1 ? Object.values(properties)[0] : undefined;
  const choices = isRecord(single) ? enumOptions(single) : undefined;
  return {
    kind: 'clarification',
    ...common,
    question: message || `The agent paused (${interrupt.reason}).`,
    ...(choices && choices.length ? { choices } : {}),
    reason: interrupt.reason,
    ...(interrupt.expiresAt ? { expiresAt: interrupt.expiresAt } : {}),
  };
}
export interface AgUiResume {
  interruptId: string;
  status: 'resolved' | 'cancelled';
  payload?: unknown;
}
export type HitlAnswer =
  | { kind: 'approval'; decision: 'approve' | 'reject'; editedArgs?: Record<string, unknown> }
  | { kind: 'form'; values: Record<string, string | boolean> }
  | { kind: 'clarification'; answer: string; key?: string }
  | { kind: 'cancel' };
/** The resume entry for one answered request. Denials travel in the payload, as the protocol asks. */
export function toAgUiResume(request: HitlRequest, answer: HitlAnswer): AgUiResume {
  if (answer.kind === 'cancel') return { interruptId: request.interruptId, status: 'cancelled' };
  if (request.kind === 'approval' && answer.kind === 'approval') {
    const payload: Record<string, unknown> = { approved: answer.decision === 'approve' };
    if (answer.decision === 'approve' && request.allowsEdits && answer.editedArgs)
      payload.editedArgs = answer.editedArgs;
    return { interruptId: request.interruptId, status: 'resolved', payload };
  }
  if (request.kind === 'form' && answer.kind === 'form')
    return {
      interruptId: request.interruptId,
      status: 'resolved',
      payload: coerceFieldValues(request.fields, answer.values),
    };
  if (request.kind === 'clarification' && answer.kind === 'clarification')
    return {
      interruptId: request.interruptId,
      status: 'resolved',
      payload: { [answer.key ?? 'answer']: answer.answer },
    };
  return { interruptId: request.interruptId, status: 'cancelled' };
}

// ---------- MCP elicitation ----------

export type McpElicitation =
  | {
      kind: 'form';
      serverName: string;
      message: string;
      fields: HitlField[];
      unsupported: HitlUnsupported[];
    }
  | {
      kind: 'url';
      serverName: string;
      message: string;
      url: string;
      host: string;
      elicitationId: string;
    }
  | { kind: 'unsupported'; serverName: string; message: string; reason: string };
/** Reads `elicitation/create` params. URL mode keeps the host visible so the person can consent. */
export function fromMcpElicitation(
  params: unknown,
  context: { serverName: string },
): McpElicitation {
  const serverName = context.serverName;
  if (!isRecord(params))
    return { kind: 'unsupported', serverName, message: '', reason: 'Params were not an object' };
  const message = typeof params.message === 'string' ? params.message.slice(0, 2000) : '';
  const mode = params.mode ?? 'form';
  if (mode === 'url') {
    const url = typeof params.url === 'string' ? params.url : '';
    let host = '';
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:')
        return {
          kind: 'unsupported',
          serverName,
          message,
          reason: 'URL elicitation must use https',
        };
      host = parsed.host;
    } catch {
      return {
        kind: 'unsupported',
        serverName,
        message,
        reason: 'URL elicitation had no valid URL',
      };
    }
    const elicitationId = typeof params.elicitationId === 'string' ? params.elicitationId : '';
    if (!elicitationId)
      return {
        kind: 'unsupported',
        serverName,
        message,
        reason: 'URL elicitation lacked an elicitationId',
      };
    return { kind: 'url', serverName, message, url, host, elicitationId };
  }
  if (mode !== 'form')
    return {
      kind: 'unsupported',
      serverName,
      message,
      reason: `Mode "${text(mode, 'unknown')}" is not read`,
    };
  const { fields, unsupported } = fieldsFromSchema(params.requestedSchema);
  return { kind: 'form', serverName, message, fields, unsupported };
}
export type McpElicitationResult =
  | { action: 'accept'; content?: Record<string, string | number | boolean> }
  | { action: 'decline' }
  | { action: 'cancel' };
export function toMcpElicitationResult(
  elicitation: McpElicitation,
  answer:
    | { action: 'accept'; values?: Record<string, string | boolean> }
    | { action: 'decline' }
    | { action: 'cancel' },
): McpElicitationResult {
  if (answer.action !== 'accept') return { action: answer.action };
  if (elicitation.kind === 'form')
    return {
      action: 'accept',
      content: coerceFieldValues(elicitation.fields, answer.values ?? {}),
    };
  return { action: 'accept' };
}
