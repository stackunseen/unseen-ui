import { z } from 'zod';
import type { AdapterScope } from '@ai-interaction/core/adapter';
import type { SubmissionState } from '@ai-interaction/core';
import { boundedData } from './bounded-data.js';

/** Presentation contracts only. The host authenticates, authorizes and durably deduplicates. */
export type DecisionSubmission<Command, Receipt> =
  | { state: 'idle' }
  | {
      state: Exclude<SubmissionState, 'idle'>;
      /** Keep this exact original after a refresh, scope change or lost acknowledgement. */
      original: Command;
      receipt?: Receipt;
    };

export const decisionId = z
  .string()
  .min(1)
  .max(160)
  .refine((value) => !!value.trim() && !/[\p{Cc}\p{Cs}]/u.test(value));
export const decisionTime = z
  .string()
  .max(64)
  .refine((value) => Number.isFinite(Date.parse(value)));
export const decisionScopes = z
  .array(decisionId)
  .min(1)
  .max(50)
  .refine((values) => new Set(values).size === values.length);
export const decisionScope = z.strictObject({
  workspaceId: decisionId,
  threadId: decisionId,
  branchId: decisionId.optional(),
  runId: decisionId,
  attemptId: decisionId,
  streamId: decisionId,
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
}) satisfies z.ZodType<AdapterScope>;
export const decisionAccess = z.strictObject({
  state: z.enum(['available', 'denied', 'revoked', 'unknown']),
  version: decisionId,
  subjectId: decisionId,
  checkedBy: decisionId,
  checkedAt: decisionTime,
});
export const decisionAcknowledgement = z.strictObject({
  by: decisionId,
  at: decisionTime,
});
export type DecisionAccess = z.infer<typeof decisionAccess>;

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function copy(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors).filter((key) => !Array.isArray(value) || key !== 'length');
  if (
    Array.isArray(value) &&
    (keys.length !== descriptors.length?.value || keys.some((key, i) => key !== String(i)))
  )
    throw new Error('Expected a dense decision array.');
  const entries = keys.map((key) => {
    const descriptor = descriptors[key]!;
    if (!('value' in descriptor)) throw new Error('Decision accessors are unsupported.');
    return [key, copy(descriptor.value)] as const;
  });
  return Array.isArray(value) ? entries.map(([, entry]) => entry) : Object.fromEntries(entries);
}
/** Copy even unknown receipt data; never freeze host input or invoke ordinary getters.
 * Reflection on a hostile Proxy is not an isolation boundary.
 */
export function inspectDecision<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
  if (!boundedData(value)) return;
  try {
    const result = schema.safeParse(copy(value));
    return result.success ? freeze(result.data) : undefined;
  } catch {
    return undefined;
  }
}

/** Only call with inspected data. Object key order is irrelevant; array order is exact. */
export function sameDecision(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const left = Object.entries(a).filter(([, value]) => value !== undefined);
  const right = Object.entries(b).filter(([, value]) => value !== undefined);
  return (
    left.length === right.length &&
    left.every(
      ([key, value]) =>
        Object.hasOwn(b, key) && sameDecision(value, (b as Record<string, unknown>)[key]),
    )
  );
}

export function decisionSubmissionSchema<C extends z.ZodType>(command: C) {
  return z.union([
    z.strictObject({ state: z.literal('idle') }),
    z.strictObject({
      state: z.enum(['submitting', 'acknowledged', 'failed', 'outcome-unknown']),
      original: command,
      // An invalid receipt must not discard a valid original or disable its lookup.
      receipt: z.unknown().optional(),
    }),
  ]);
}

export function receiptMessage(outcome?: string): string {
  switch (outcome) {
    case 'applied':
      return 'The host confirmed the original decision. Current access and ownership are reported separately.';
    case 'accepted':
      return 'The host received the original decision. Its effect is not yet confirmed.';
    case 'rejected':
      return 'The host rejected the original decision. Review a current request before deciding again.';
    case 'not-found':
      return 'The host did not find the original decision. Its outcome is still unknown; do not resend it.';
    default:
      return 'The original decision may have reached the host. Check its receipt before making another decision.';
  }
}
