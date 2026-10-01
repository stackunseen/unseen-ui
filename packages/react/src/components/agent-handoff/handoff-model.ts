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

const contextSchema = z.strictObject({
  id: decisionId,
  version: decisionId,
  sourceId: decisionId,
  sourceVersion: decisionId,
  providedBy: decisionId,
});
const targetSchema = z
  .strictObject({
    scope: decisionScope,
    runVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    handoffId: decisionId,
    version: decisionId,
    from: decisionId,
    to: decisionId,
    ownershipVersion: decisionId,
    snapshotVersion: decisionId,
    context: contextSchema,
    scopes: decisionScopes,
    accessVersion: decisionId,
    expiresAt: decisionTime,
  })
  .refine((value) => value.from !== value.to);
export type HandoffTarget = z.infer<typeof targetSchema>;
const ownershipSchema = z.discriminatedUnion('state', [
  z.strictObject({ state: z.literal('unknown') }),
  z.strictObject({
    state: z.literal('acknowledged'),
    ownerId: decisionId,
    version: decisionId,
    acknowledged: decisionAcknowledgement,
  }),
]);
const snapshotSchema = z
  .strictObject({
    target: targetSchema,
    status: z.enum([
      'requested',
      'accepted',
      'declined',
      'expired',
      'cancelled',
      'denied',
      'revoked',
      'unknown',
    ]),
    freshness: z.enum(['current', 'stale', 'unknown']),
    ownership: ownershipSchema,
    access: decisionAccess,
    summary: z.string().max(10000),
  })
  .refine(
    (value) =>
      value.access.version === value.target.accessVersion &&
      value.access.subjectId === value.target.to,
  );
export type HandoffSnapshot = z.infer<typeof snapshotSchema>;
const commandSchema = z.strictObject({
  commandId: decisionId,
  target: targetSchema,
  decision: z.enum(['accept', 'decline']),
});
export type HandoffDecisionCommand = z.infer<typeof commandSchema>;
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
      decision: z.enum(['accept', 'decline']),
      ownerId: decisionId,
      ownershipVersion: decisionId,
      /** The recipient's actual acknowledgement; the server must authenticate this identity. */
      acknowledged: decisionAcknowledgement,
      context: contextSchema,
      accessVersion: decisionId,
    }),
  ])
  .refine(
    (value) =>
      value.outcome !== 'applied' ||
      (value.decision === value.command.decision &&
        value.acknowledged.by === value.command.target.to &&
        sameDecision(value.context, value.command.target.context) &&
        value.accessVersion === value.command.target.accessVersion &&
        (value.decision === 'accept'
          ? value.ownerId === value.command.target.to &&
            value.ownershipVersion !== value.command.target.ownershipVersion
          : value.ownerId === value.command.target.from &&
            value.ownershipVersion === value.command.target.ownershipVersion)),
  );
export type HandoffReceipt = z.infer<typeof receiptSchema>;
export type HandoffSubmission = DecisionSubmission<HandoffDecisionCommand, HandoffReceipt>;

export const inspectHandoffSnapshot = (value: unknown) => inspectDecision(snapshotSchema, value);
export const inspectHandoffCommand = (value: unknown) => inspectDecision(commandSchema, value);
export const inspectHandoffSubmission = (value: unknown) =>
  inspectDecision(decisionSubmissionSchema(commandSchema), value);
export function inspectHandoffReceipt(
  original: unknown,
  receipt: unknown,
): HandoffReceipt | undefined {
  const command = inspectHandoffCommand(original),
    result = inspectDecision(receiptSchema, receipt);
  return command && result && sameDecision(command, result.command) ? result : undefined;
}
/** Compare-and-set guard only; a host must separately authorize and record the recipient. */
export function validateHandoffDecision(snapshot: unknown, command: unknown, now: number): boolean {
  const value = inspectHandoffSnapshot(snapshot),
    original = inspectHandoffCommand(command);
  return (
    !!value &&
    !!original &&
    Number.isFinite(now) &&
    value.status === 'requested' &&
    value.freshness === 'current' &&
    value.access.state === 'available' &&
    value.ownership.state === 'acknowledged' &&
    value.ownership.ownerId === value.target.from &&
    value.ownership.version === value.target.ownershipVersion &&
    now < Date.parse(value.target.expiresAt) &&
    sameDecision(value.target, original.target)
  );
}
