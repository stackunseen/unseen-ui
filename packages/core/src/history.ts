import { z } from 'zod';
import { messageSchema } from './message-schema.js';
import { inspectConversationContext } from './conversation-validation.js';
import type { ConversationContext } from './conversation.js';
import type { MessageData } from './types.js';

export type HistoryEdge = {
  state: 'end' | 'available' | 'loading' | 'error' | 'unknown';
  cursor?: string;
  detail?: string;
};
/** Chronological host window; no transport, storage or permission is implied. */
export interface ConversationHistory {
  context: ConversationContext;
  messages: readonly MessageData[];
  older: HistoryEdge;
  newer: HistoryEdge;
  startIndex?: number;
  totalMessages?: number;
}
export interface HistoryPageRequest {
  context: ConversationContext;
  direction: 'older' | 'newer';
  cursor: string;
}
export interface HistoryPosition {
  context: ConversationContext;
  messageId: string;
  /** Pixels from this message's top to the reading surface's top. */
  inset: number;
}
export interface HistoryRestore extends HistoryPosition {
  requestId: string;
}
export interface HistoryRestoreResult {
  requestId: string;
  context: ConversationContext;
  outcome: 'applied' | 'obsolete' | 'missing';
}
export const historyLimits = Object.freeze({
  messages: 10_000,
  readingMessages: 200,
  units: 5_000_000,
});
const id = z
  .string()
  .min(1)
  .max(160)
  .refine((v) => !!v.trim() && !/[\p{Cc}\p{Cs}]/u.test(v));
const edge = z
  .strictObject({
    state: z.enum(['end', 'available', 'loading', 'error', 'unknown']),
    cursor: id.optional(),
    detail: z.string().max(1000).optional(),
  })
  .refine((v) => ['available', 'loading', 'error'].includes(v.state) === !!v.cursor);
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const shell = z.strictObject({
  context: z.unknown(),
  messages: z.array(z.unknown()).max(historyLimits.messages),
  older: edge,
  newer: edge,
  startIndex: count.optional(),
  totalMessages: count.optional(),
});

// Inspect descriptors before parsing. Frozen rows can reuse their validated copies;
// mutable rows are always checked again. This does not isolate arbitrary Proxy traps.
const cache = new WeakMap<object, { value: MessageData; units: number; values: number }>();
const windows = new WeakMap<object, ConversationHistory>();
function plain(value: unknown, maxArray = 100) {
  let units = 0,
    values = 0,
    frozen = true;
  const ancestors = new WeakSet<object>();
  function visit(v: unknown, depth: number): boolean {
    if (++values > 2000 || depth > 8) return false;
    if (typeof v === 'string') {
      units += v.length;
      return v.length <= 100_000;
    }
    if (v == null || typeof v === 'boolean') return true;
    if (typeof v === 'number') return Number.isFinite(v);
    if (typeof v !== 'object' || ancestors.has(v)) return false;
    const array = Array.isArray(v);
    if (array ? v.length > maxArray : ![Object.prototype, null].includes(Object.getPrototypeOf(v)))
      return false;
    frozen &&= Object.isFrozen(v);
    const descriptors = Object.getOwnPropertyDescriptors(v);
    const keys = Reflect.ownKeys(descriptors).filter((key) => !array || key !== 'length');
    if (keys.length > (array ? maxArray : 16) || keys.some((k) => typeof k !== 'string'))
      return false;
    if (array && (keys.length !== v.length || keys.some((k, i) => k !== String(i)))) return false;
    ancestors.add(v);
    const valid = keys.every((k) => {
      const d = descriptors[k as string]!;
      return 'value' in d && visit(d.value, depth + 1);
    });
    ancestors.delete(v);
    return valid;
  }
  return visit(value, 0) ? { units, values, frozen } : undefined;
}
function freezeMessage(message: MessageData): MessageData {
  if (message.parts) {
    message.parts.forEach(Object.freeze);
    Object.freeze(message.parts);
  }
  if (message.error) Object.freeze(message.error);
  return Object.freeze(message);
}
export function inspectConversationHistory(input: unknown): ConversationHistory | undefined {
  try {
    if (input && typeof input === 'object' && windows.has(input)) return windows.get(input);
    if (
      !input ||
      typeof input !== 'object' ||
      Array.isArray(input) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(input))
    )
      return;
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const keys = Reflect.ownKeys(descriptors);
    if (
      keys.length > 7 ||
      keys.some((k) => typeof k !== 'string' || !('value' in descriptors[k as string]!))
    )
      return;
    const rawMessages = descriptors.messages?.value;
    if (!Array.isArray(rawMessages) || rawMessages.length > historyLimits.messages) return;
    const rows = Object.getOwnPropertyDescriptors(rawMessages);
    const rowKeys = Reflect.ownKeys(rows).filter((k) => k !== 'length');
    if (
      rowKeys.length !== rawMessages.length ||
      rowKeys.some((k, i) => k !== String(i) || !('value' in rows[k as string]!))
    )
      return;
    const metadata = Object.fromEntries(
      keys.filter((k) => k !== 'messages').map((k) => [k, descriptors[k as string]!.value]),
    );
    if (!plain(metadata)) return;
    const result = shell.safeParse({ ...metadata, messages: [] });
    if (!result.success) return;
    const context = inspectConversationContext(result.data.context);
    if (!context?.threadId) return;
    let units = 0,
      values = 0;
    const messages: MessageData[] = [],
      ids = new Set<string>();
    for (const key of rowKeys) {
      const raw = rows[key as string]!.value;
      let record = raw && typeof raw === 'object' ? cache.get(raw) : undefined;
      if (!record) {
        const bounds = plain(raw);
        if (!bounds) return;
        const parsed = messageSchema.safeParse(raw);
        if (!parsed.success || !id.safeParse(parsed.data.id).success) return;
        record = { value: freezeMessage(parsed.data), units: bounds.units, values: bounds.values };
        if (bounds.frozen && raw && typeof raw === 'object') cache.set(raw, record);
      }
      units += record.units;
      values += record.values;
      if (units > historyLimits.units || values > 200_000 || ids.has(record.value.id)) return;
      ids.add(record.value.id);
      messages.push(record.value);
    }
    const { startIndex, totalMessages } = result.data;
    if (totalMessages !== undefined && startIndex === undefined) return;
    if (
      startIndex !== undefined &&
      (!Number.isSafeInteger(startIndex + messages.length) ||
        (totalMessages !== undefined && startIndex + messages.length > totalMessages))
    )
      return;
    if (startIndex !== undefined && result.data.older.state === 'end' && startIndex !== 0) return;
    if (startIndex === 0 && ['available', 'loading', 'error'].includes(result.data.older.state))
      return;
    if (
      totalMessages !== undefined &&
      result.data.newer.state === 'end' &&
      startIndex! + messages.length !== totalMessages
    )
      return;
    if (
      totalMessages !== undefined &&
      startIndex! + messages.length === totalMessages &&
      ['available', 'loading', 'error'].includes(result.data.newer.state)
    )
      return;
    const history = Object.freeze({
      ...result.data,
      context: Object.freeze(context),
      messages: Object.freeze(messages),
      older: Object.freeze(result.data.older),
      newer: Object.freeze(result.data.newer),
    });
    if (
      Object.isFrozen(input) &&
      Object.isFrozen(rawMessages) &&
      Object.isFrozen(descriptors.context?.value) &&
      Object.isFrozen(descriptors.older?.value) &&
      Object.isFrozen(descriptors.newer?.value) &&
      rowKeys.every((k) => cache.has(rows[k as string]!.value))
    )
      windows.set(input, history);
    return history;
  } catch {
    return;
  }
}
export function inspectHistoryRestore(input: unknown): HistoryRestore | undefined {
  try {
    if (!plain(input)) return;
    const result = z
      .strictObject({
        requestId: id,
        context: z.unknown(),
        messageId: id,
        inset: z.number().min(0).max(100_000),
      })
      .safeParse(input);
    if (!result.success) return;
    const context = inspectConversationContext(result.data.context);
    return context?.threadId ? { ...result.data, context } : undefined;
  } catch {
    return;
  }
}
/** A revision can change while the same thread's reading position remains useful. */
export const historyScopeKey = (context: ConversationContext) =>
  JSON.stringify([context.workspaceId, context.threadId, context.branchId]);
