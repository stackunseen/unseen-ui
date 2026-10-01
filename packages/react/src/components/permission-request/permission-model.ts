import { z } from 'zod';
import {
  decisionAccess,
  decisionAcknowledgement,
  decisionId,
  decisionScope,
  decisionScopes,
  decisionSubmissionSchema,
  decisionTime,
  inspectDecision,
  sameDecision,
} from '../../shared/decision-contracts.js';
import type { DecisionSubmission } from '../../shared/decision-contracts.js';

const targetSchema = z.strictObject({
  scope: decisionScope,
  runVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  requestId: decisionId,
  version: decisionId,
  subjectId: decisionId,
  resource: decisionId,
  scopes: decisionScopes,
  accessVersion: decisionId,
  expiresAt: decisionTime,
});
export type PermissionTarget = z.infer<typeof targetSchema>;
const snapshotSchema = z
  .strictObject({
    target: targetSchema,
    status: z.enum(['requested', 'granted', 'denied', 'revoked', 'expired', 'unknown']),
    freshness: z.enum(['current', 'stale', 'unknown']),
    access: decisionAccess,
    /** A host assertion of current permission, independent of historical command receipts. */
    grant: z
      .strictObject({ id: decisionId, version: decisionId, acknowledged: decisionAcknowledgement })
      .optional(),
  })
  .refine(
    (value) =>
      value.access.version === value.target.accessVersion &&
      value.access.subjectId === value.target.subjectId &&
      (value.status !== 'granted' || !!value.grant),
  );
export type PermissionSnapshot = z.infer<typeof snapshotSchema>;
const commandSchema = z.strictObject({
  commandId: decisionId,
  target: targetSchema,
  decision: z.enum(['allow', 'deny']),
});
export type PermissionDecisionCommand = z.infer<typeof commandSchema>;
const receiptSchema = z
  .discriminatedUnion('outcome', [
    z.strictObject({
      command: commandSchema,
      outcome: z.enum(['accepted', 'rejected', 'unknown', 'not-found']),
      detail: z.string().max(1000).optional(),
    }),
    z.strictObject({
      command: commandSchema,
      outcome: z.literal('applied'),
      permission: z.enum(['granted', 'denied']),
      acknowledged: decisionAcknowledgement,
      grant: z.strictObject({ id: decisionId, version: decisionId }).optional(),
    }),
  ])
  .refine(
    (value) =>
      value.outcome !== 'applied' ||
      (value.command.decision === 'allow'
        ? value.permission === 'granted' && !!value.grant
        : value.permission === 'denied' && !value.grant),
  );
export type PermissionReceipt = z.infer<typeof receiptSchema>;
export type PermissionSubmission = DecisionSubmission<PermissionDecisionCommand, PermissionReceipt>;

export const inspectPermissionSnapshot = (value: unknown) => inspectDecision(snapshotSchema, value);
export const inspectPermissionCommand = (value: unknown) => inspectDecision(commandSchema, value);
export const inspectPermissionSubmission = (value: unknown) =>
  inspectDecision(decisionSubmissionSchema(commandSchema), value);
export function inspectPermissionReceipt(
  original: unknown,
  receipt: unknown,
): PermissionReceipt | undefined {
  const command = inspectPermissionCommand(original);
  const result = inspectDecision(receiptSchema, receipt);
  return command && result && sameDecision(command, result.command) ? result : undefined;
}
/** Validation is not authorization. Compare against the host's CURRENT snapshot and clock. */
export function validatePermissionDecision(
  snapshot: unknown,
  command: unknown,
  now: number,
): boolean {
  const value = inspectPermissionSnapshot(snapshot),
    original = inspectPermissionCommand(command);
  return (
    !!value &&
    !!original &&
    Number.isFinite(now) &&
    value.status === 'requested' &&
    value.freshness === 'current' &&
    value.access.state === 'available' &&
    now < Date.parse(value.target.expiresAt) &&
    sameDecision(value.target, original.target)
  );
}
