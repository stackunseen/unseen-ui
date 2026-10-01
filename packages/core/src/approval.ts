import type { ApprovalDecision, ApprovalProposal } from './types.js';

/** A validation helper, NOT authorization. Hosts must derive identity and enforce permissions. */
export function validateApprovalDecision(
  proposal: ApprovalProposal,
  command: ApprovalDecision,
  now: number,
): { ok: true } | { ok: false; reason: string } {
  if (!Number.isFinite(now) || !Number.isFinite(Date.parse(proposal.expiresAt)))
    return { ok: false, reason: 'Invalid approval clock.' };
  if (proposal.status !== 'pending')
    return { ok: false, reason: 'This proposal has already been resolved.' };
  if (now >= Date.parse(proposal.expiresAt))
    return { ok: false, reason: 'This proposal has expired.' };
  if (
    !command.commandId ||
    command.commandId.length > 160 ||
    !['approve', 'reject'].includes(command.decision)
  )
    return { ok: false, reason: 'Invalid decision command.' };
  if (
    command.proposalId !== proposal.id ||
    command.version !== proposal.version ||
    command.actionDigest !== proposal.actionDigest
  )
    return { ok: false, reason: 'The proposal changed. Review its current version.' };
  return { ok: true };
}
export function safeUrl(value?: string): string | undefined {
  if (!value || value.length > 2000) return undefined;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
