import type { MessageData, MessageError, MessageState, ToolCallData } from './types.js';

/** The short form a prototype passes: a name, and whatever else is known. */
export type ToolCallInput = Partial<ToolCallData> & { name: string };

/**
 * Fills the fields a host would normally supply. Without a state the call reads from what is
 * present: an error means failed, an output means succeeded, otherwise running.
 */
export function toolCallFrom(input: ToolCallInput | ToolCallData): ToolCallData {
  const state =
    input.state ?? (input.error ? 'failed' : input.output !== undefined ? 'succeeded' : 'running');
  const call: ToolCallData = {
    id: input.id ?? input.name,
    name: input.name,
    revision: input.revision ?? 1,
    state,
    input: input.input ?? '',
  };
  if (input.output !== undefined) call.output = input.output;
  if (input.error !== undefined) call.error = input.error;
  if (input.durationMs !== undefined) call.durationMs = input.durationMs;
  if (input.label !== undefined) call.label = input.label;
  if (input.target !== undefined) call.target = input.target;
  return call;
}

/** A message as a prototype writes it: a role and text, the rest optional. */
export interface MessageInput {
  role: MessageData['role'];
  text: string;
  id?: string;
  state?: MessageState;
  revision?: number;
  createdAt?: string;
  error?: MessageError;
}

/** Returns host data unchanged and fills defaults for the short form. */
export function messageFrom(input: MessageInput | MessageData): MessageData {
  if ('parts' in input && input.parts) return input;
  if (input.id !== undefined && input.revision !== undefined && input.state !== undefined)
    return input as MessageData;
  const message: MessageData = {
    id: input.id ?? `${input.role}-message`,
    role: input.role,
    text: (input as MessageInput).text,
    state: input.state ?? 'complete',
    revision: input.revision ?? 0,
  };
  if (input.createdAt) message.createdAt = input.createdAt;
  if (input.error) message.error = input.error;
  return message;
}
