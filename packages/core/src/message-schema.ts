import { z } from 'zod';
import type { MessageData, MessagePart } from './types.js';
import { messageTextLength } from './messages.js';
const id = z
  .string()
  .min(1)
  .max(160)
  .refine((value) => value.trim().length > 0);
const short = z.string().max(1000);
const text = z.string().max(100_000);
export const messageErrorSchema = z.strictObject({ code: id, message: short.min(1) });
export const messagePartSchema = z.discriminatedUnion('type', [
  z.strictObject({
    id,
    type: z.literal('text'),
    format: z.enum(['plain', 'markdown']),
    text,
    state: z.enum(['streaming', 'complete', 'interrupted']),
  }),
  z.strictObject({ id, type: z.literal('tool'), toolCallId: id }),
  z.strictObject({
    id,
    type: z.literal('source'),
    sourceId: id,
    version: id,
    locator: short.min(1),
  }),
  z.strictObject({ id, type: z.literal('attachment'), attachmentId: id, version: id }),
  z.strictObject({ id, type: z.literal('unsupported'), kind: id, label: short.min(1) }),
  z.strictObject({
    id,
    type: z.literal('reasoning'),
    text,
    state: z.enum(['streaming', 'complete']),
  }),
  z.strictObject({
    id,
    type: z.literal('file'),
    name: short.min(1),
    mediaType: short.min(1),
    // Data URLs for attached images can be long; renderers still check the scheme.
    url: z.string().max(12_000_000).optional(),
  }),
]) satisfies z.ZodType<MessagePart>;
const common = {
  id: z.string().min(1).max(160),
  role: z.enum(['user', 'assistant', 'system']),
  state: z.enum(['complete', 'streaming', 'interrupted', 'failed']),
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  createdAt: z.iso.datetime().optional(),
  error: messageErrorSchema.optional(),
};
export const messageSchema = z
  .union([
    z.strictObject({ ...common, text }),
    z.strictObject({ ...common, parts: z.array(messagePartSchema).max(100) }),
  ])
  .superRefine((message, context) => {
    if ((message.state === 'failed') !== !!message.error)
      context.addIssue({
        code: 'custom',
        message: 'Failed messages require an error; other states cannot carry one.',
      });
    if (!('parts' in message)) return;
    const { parts } = message;
    if (new Set(parts.map((part) => part.id)).size !== parts.length)
      context.addIssue({ code: 'custom', message: 'Duplicate message part identity.' });
    if (messageTextLength(parts) > 100_000)
      context.addIssue({ code: 'custom', message: 'Message text limit exceeded.' });
    for (const [index, part] of parts.entries()) {
      if (part.type !== 'text') continue;
      if (
        part.state === 'streaming' &&
        (message.state !== 'streaming' || index !== parts.length - 1)
      )
        context.addIssue({
          code: 'custom',
          message: 'Only the final part of a streaming message may stream.',
        });
      if (part.state === 'interrupted' && !['interrupted', 'failed'].includes(message.state))
        context.addIssue({
          code: 'custom',
          message: 'Interrupted parts require an interrupted or failed message.',
        });
    }
  }) satisfies z.ZodType<MessageData>;

export function isLegacyMessage(message: MessageData): boolean {
  return !message.parts && !message.createdAt && !message.error && message.state !== 'failed';
}
