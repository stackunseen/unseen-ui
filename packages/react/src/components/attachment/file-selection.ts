export interface AttachmentRejection {
  file: File;
  reason: 'type' | 'size' | 'count';
}
export interface FileSelectionLimits {
  /** Comma-separated MIME types, MIME wildcards, or file extensions. Still validate on the host. */
  accept?: string;
  maxFileBytes?: number;
  /** Available slots, including existing attachments; host updates this value. */
  remainingSlots?: number;
}
export function byteCount(value: number | undefined): value is number {
  return value !== undefined && Number.isSafeInteger(value) && value >= 0;
}
/** Slots the next batch may fill: a safe count capped at 100, or 0 when the host sent nonsense. */
export function selectionSlots(remainingSlots = 10): number {
  return Number.isSafeInteger(remainingSlots) && remainingSlots >= 0
    ? Math.min(remainingSlots, 100)
    : 0;
}
/** Whether the limits allow any selection at all. */
export function selectionLocked({
  disabled = false,
  maxFileBytes,
  remainingSlots,
}: FileSelectionLimits & { disabled?: boolean }): boolean {
  const validSize = maxFileBytes === undefined || (byteCount(maxFileBytes) && maxFileBytes > 0);
  return disabled || selectionSlots(remainingSlots) === 0 || !validSize;
}
export function fileAccepted(file: File, accept?: string): boolean {
  if (!accept) return true;
  return accept.split(',').some((part) => {
    const rule = part.trim().toLowerCase();
    if (!rule) return false;
    return rule.startsWith('.')
      ? file.name.toLowerCase().endsWith(rule)
      : rule.endsWith('/*')
        ? file.type.toLowerCase().startsWith(rule.slice(0, -1))
        : file.type.toLowerCase() === rule;
  });
}
/** Splits a batch into files the host may receive and files rejected by type, size or slot count. */
export function partitionFiles(
  incoming: readonly File[],
  { accept, maxFileBytes, remainingSlots }: FileSelectionLimits,
): { accepted: File[]; rejected: AttachmentRejection[] } {
  const slots = selectionSlots(remainingSlots);
  const accepted: File[] = [];
  const rejected: AttachmentRejection[] = [];
  for (const file of incoming) {
    const reason = !fileAccepted(file, accept)
      ? 'type'
      : maxFileBytes !== undefined && file.size > maxFileBytes
        ? 'size'
        : accepted.length >= slots
          ? 'count'
          : undefined;
    if (reason) rejected.push({ file, reason });
    else accepted.push(file);
  }
  return { accepted, rejected };
}
export function rejectionReasonText(reason: AttachmentRejection['reason']): string {
  return reason === 'type'
    ? 'File type not accepted'
    : reason === 'size'
      ? 'File exceeds the size limit'
      : 'No attachment slots available';
}
export function selectionNotice(accepted: number, rejected: number): string {
  if (rejected)
    return `${rejected} file${rejected === 1 ? '' : 's'} not added. Check file type, size and available slots.`;
  return accepted ? `${accepted} file${accepted === 1 ? '' : 's'} selected.` : '';
}
