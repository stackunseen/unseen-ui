import { z } from 'zod';
import type {
  DocumentIdentity,
  DocumentSnapshot,
  VersionedTextTarget,
} from '@stackunseen/ui-core/editing';
import { applyTextEdits } from '@stackunseen/ui-core/editing';
import { decisionId, inspectDecision, sameDecision } from '../../shared/decision-contracts.js';

/** documentId/version identify the exact message. The host supplies every scope identity. */
export interface ConversationMessageTarget extends DocumentIdentity {
  readonly workspaceId: string;
  readonly threadId: string;
  readonly branchId: string;
  readonly branchVersion: string;
  readonly attemptId: string;
  readonly role: 'user' | 'assistant';
}
export interface ConversationMessageSnapshot extends ConversationMessageTarget {
  readonly text: string;
}
export type ConversationActionCommand =
  | {
      readonly kind: 'edit';
      readonly commandId: string;
      readonly target: ConversationMessageTarget;
      readonly draft: DocumentSnapshot;
      readonly newBranchId: string;
    }
  | {
      readonly kind: 'regenerate';
      readonly commandId: string;
      readonly target: ConversationMessageTarget;
      readonly newAttemptId: string;
    };
export type MessageEditCommand = Extract<ConversationActionCommand, { kind: 'edit' }>;
export type MessageRegenerateCommand = Extract<ConversationActionCommand, { kind: 'regenerate' }>;
export type ConversationActionReceipt = { readonly command: ConversationActionCommand } & (
  | {
      readonly result: 'applied';
      readonly branchId: string;
      readonly branchVersion: string;
      readonly attemptId: string;
    }
  | { readonly result: 'rejected'; readonly reason: string }
);
export type ConversationActionState =
  | { readonly status: 'idle' }
  | { readonly status: 'pending' | 'unknown'; readonly command: ConversationActionCommand }
  | { readonly status: 'settled'; readonly receipt: ConversationActionReceipt };

const identity = { documentId: decisionId, version: decisionId };
const targetSchema = z.object({
  ...identity,
  workspaceId: decisionId,
  threadId: decisionId,
  branchId: decisionId,
  branchVersion: decisionId,
  attemptId: decisionId,
  role: z.enum(['user', 'assistant']),
});
const draftSchema = z.strictObject({
  ...identity,
  text: z.string().max(20_000),
  language: z.string().max(100).optional(),
  path: z.string().max(2_000).optional(),
});
const commandSchema = z.discriminatedUnion('kind', [
  z
    .strictObject({
      kind: z.literal('edit'),
      commandId: decisionId,
      target: targetSchema,
      draft: draftSchema,
      newBranchId: decisionId,
    })
    .refine(
      (command) =>
        command.target.role === 'user' &&
        command.newBranchId !== command.target.branchId &&
        !!command.draft.text.trim(),
    ),
  z
    .strictObject({
      kind: z.literal('regenerate'),
      commandId: decisionId,
      target: targetSchema,
      newAttemptId: decisionId,
    })
    .refine(
      (command) =>
        command.target.role === 'assistant' && command.newAttemptId !== command.target.attemptId,
    ),
]);
const receiptSchema = z.discriminatedUnion('result', [
  z
    .strictObject({
      command: commandSchema,
      result: z.literal('applied'),
      branchId: decisionId,
      branchVersion: decisionId,
      attemptId: decisionId,
    })
    .refine((receipt) =>
      receipt.command.kind === 'edit'
        ? receipt.branchId === receipt.command.newBranchId
        : receipt.branchId === receipt.command.target.branchId &&
          receipt.attemptId === receipt.command.newAttemptId,
    ),
  z.strictObject({
    command: commandSchema,
    result: z.literal('rejected'),
    reason: z.string().min(1).max(1_000),
  }),
]);
const stateSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('idle') }),
  z.strictObject({ status: z.enum(['pending', 'unknown']), command: commandSchema }),
  z.strictObject({ status: z.literal('settled'), receipt: receiptSchema }),
]);

export function inspectConversationAction(command: unknown): ConversationActionCommand | undefined {
  return inspectDecision(commandSchema, command);
}
export function inspectConversationActionState(
  state: unknown,
): ConversationActionState | undefined {
  return inspectDecision(stateSchema, state);
}
export function sameConversationTarget(a: unknown, b: unknown): boolean {
  const left = inspectDecision(targetSchema, a),
    right = inspectDecision(targetSchema, b);
  return !!left && !!right && sameDecision(left, right);
}
export function sameConversationScope(
  a: ConversationMessageTarget,
  b: ConversationMessageTarget,
): boolean {
  if (!inspectDecision(targetSchema, a) || !inspectDecision(targetSchema, b)) return false;
  return (
    a.workspaceId === b.workspaceId &&
    a.threadId === b.threadId &&
    a.branchId === b.branchId &&
    a.documentId === b.documentId
  );
}
export function conversationActionReason(
  target: ConversationMessageTarget,
  current: ConversationMessageTarget,
  command: unknown,
  state: unknown,
): string | undefined {
  if (!sameConversationTarget(target, current))
    return 'Message revision or conversation scope changed. Review the current message.';
  const original = inspectConversationAction(command),
    submission = inspectConversationActionState(state);
  if (!original || !sameConversationTarget(original.target, target))
    return 'Exact action scope is unavailable.';
  if (!submission)
    return 'The result of this action isn’t available. Check it before trying again.';
  if (submission.status === 'pending') return 'Waiting for confirmation.';
  if (submission.status === 'unknown')
    return 'Action outcome is unknown. Check the original request before trying again.';
  if (
    submission.status === 'settled' &&
    submission.receipt.command.commandId === original.commandId
  )
    return 'This request has already finished. Send a new request to try again.';
}

/** Controlled draft insertion only; the host must publish a new draft version. */
export function insertPromptText(
  snapshot: DocumentSnapshot & { readonly digest?: string },
  target: VersionedTextTarget,
  insert: string,
) {
  if (!target.range || typeof insert !== 'string')
    return { ok: false as const, reason: 'invalid' as const };
  if (target.digest !== undefined && target.digest !== snapshot.digest)
    return { ok: false as const, reason: 'stale' as const };
  const result = applyTextEdits(snapshot, target, [{ range: target.range, insert }], 20_000);
  if (!result.ok) return result;
  const offset = target.range.from + insert.length;
  return { ...result, selection: { from: offset, to: offset } };
}
