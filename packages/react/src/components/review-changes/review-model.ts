import { applyTextEdits, sameDocumentIdentity } from '@stackunseen/ui-core/editing';
import type { DocumentIdentity, VersionedTextTarget } from '@stackunseen/ui-core/editing';
import type { ProposedChange } from './review-changes.js';
import type {
  ReviewChangesContract,
  ReviewCommand,
  ReviewFileSelection,
  ReviewHunkSelection,
  ReviewReceipt,
} from './review-contract.js';

const identifier = (value: string) =>
  typeof value === 'string' && !!value.trim() && value.length <= 256;
const identity = (value: DocumentIdentity) =>
  !!value && identifier(value.documentId) && identifier(value.version);

export function sameReviewTarget(a: VersionedTextTarget, b: VersionedTextTarget): boolean {
  return (
    sameDocumentIdentity(a, b) &&
    a.digest === b.digest &&
    (a.range ? !!b.range && a.range.from === b.range.from && a.range.to === b.range.to : !b.range)
  );
}

function sameFiles(a: readonly ReviewFileSelection[], b: readonly ReviewFileSelection[]): boolean {
  return (
    a.length === b.length &&
    a.every((file, index) => {
      const other = b[index];
      return (
        !!other &&
        file.id === other.id &&
        sameReviewTarget(file.target, other.target) &&
        (file.hunkIds
          ? !!other.hunkIds &&
            file.hunkIds.length === other.hunkIds.length &&
            file.hunkIds.every((id, offset) => id === other.hunkIds?.[offset])
          : !other.hunkIds)
      );
    })
  );
}

export function sameReviewCommand(a: ReviewCommand, b: ReviewCommand): boolean {
  return (
    a.commandId === b.commandId &&
    sameDocumentIdentity(a.target, b.target) &&
    a.baseVersion === b.baseVersion &&
    a.proposalVersion === b.proposalVersion &&
    a.action === b.action &&
    a.undoOf === b.undoOf &&
    sameFiles(a.files, b.files)
  );
}

export function selectedReviewFiles(
  changes: readonly ProposedChange[],
  selectedIds: readonly string[],
  selectedHunks: readonly ReviewHunkSelection[],
): ReviewFileSelection[] {
  return changes
    .filter((file) => selectedIds.includes(file.id) && file.target)
    .flatMap((file) => {
      const selection = selectedHunks.find((item) => item.changeId === file.id);
      if (file.hunks?.length && selection) {
        const hunkIds = file.hunks
          .filter((hunk) => selection.hunkIds.includes(hunk.id))
          .map((hunk) => hunk.id);
        return hunkIds.length ? [{ id: file.id, target: file.target!, hunkIds }] : [];
      }
      return [{ id: file.id, target: file.target! }];
    });
}

/** Bounded consistency checks only; the host still authorizes every command. */
export function reviewProblem(
  changes: readonly ProposedChange[],
  baseVersion: string,
  proposalVersion: string,
  selectedIds: readonly string[],
  review: ReviewChangesContract,
): string | undefined {
  if (changes.length > 50) return 'This proposal exceeds the 50-change review limit.';
  const offered = Object.values(review.commands).filter(
    (command): command is ReviewCommand => !!command,
  );
  if (
    offered.length > 3 ||
    offered.length !== new Set(offered.map((item) => item.commandId)).size ||
    (review.completedCommandIds &&
      (review.completedCommandIds.length > 100 ||
        review.completedCommandIds.length !== new Set(review.completedCommandIds).size ||
        review.completedCommandIds.some((id) => !identifier(id))))
  )
    return 'Command identities or history are ambiguous. Refresh host state.';
  if (
    !identifier(baseVersion) ||
    !identifier(proposalVersion) ||
    baseVersion === proposalVersion ||
    !identity(review.proposal) ||
    review.proposal.version !== proposalVersion
  )
    return 'The proposal identity or immutable versions are invalid.';
  if (
    changes.length !== new Set(changes.map((file) => file.id)).size ||
    changes.some((file) => !identifier(file.id))
  )
    return 'Change identifiers are ambiguous.';
  if (
    selectedIds.length > 50 ||
    selectedIds.length !== new Set(selectedIds).size ||
    selectedIds.some((id) => !changes.some((file) => file.id === id))
  )
    return 'The file selection is invalid. Refresh the selection.';
  if (
    review.currentTargets.length > 50 ||
    review.currentTargets.some((target) => !identity(target)) ||
    review.currentTargets.length !==
      new Set(review.currentTargets.map((target) => target.documentId)).size
  )
    return 'Current document identities are ambiguous or unavailable.';
  if (
    review.selectedHunks.length > 50 ||
    review.selectedHunks.length !==
      new Set(review.selectedHunks.map((item) => item.changeId)).size ||
    review.selectedHunks.some((selection) => {
      const file = changes.find((item) => item.id === selection.changeId);
      return (
        !file?.hunks?.length ||
        selection.hunkIds.length > 50 ||
        selection.hunkIds.length !== new Set(selection.hunkIds).size ||
        selection.hunkIds.some((id) => !file.hunks!.some((hunk) => hunk.id === id))
      );
    })
  )
    return 'The hunk selection is invalid. Refresh the selection.';
  if (changes.reduce((size, file) => size + file.before.length + file.after.length, 0) > 300_000)
    return 'This proposal exceeds the text review limit. Request a smaller proposal.';
  const paths = new Set<string>(),
    documents = new Set<string>();
  let hunkCount = 0;
  for (const file of changes) {
    if (
      !file.path.trim() ||
      file.path.length > 1000 ||
      paths.has(file.path) ||
      !file.target ||
      !identity(file.target) ||
      sameDocumentIdentity(file.target, review.proposal) ||
      file.target.range ||
      documents.has(file.target.documentId) ||
      (file.target.digest !== undefined && !identifier(file.target.digest))
    )
      return 'File paths or targets are invalid or ambiguous.';
    paths.add(file.path);
    documents.add(file.target.documentId);
    const operation = file.operation?.kind ?? 'modify';
    if (
      !['add', 'modify', 'delete', 'rename'].includes(operation) ||
      (operation === 'add' && file.before !== '') ||
      (operation === 'delete' && file.after !== '') ||
      (file.operation?.kind === 'rename' &&
        (!file.operation.fromPath.trim() ||
          file.operation.fromPath === file.path ||
          file.operation.fromPath.length > 1000))
    )
      return 'File operation metadata does not match the comparison.';
    if (file.hunks) {
      hunkCount += file.hunks.length;
      if (
        operation !== 'modify' ||
        !file.hunks.length ||
        file.hunks.length > 50 ||
        hunkCount > 200 ||
        file.hunks.length !== new Set(file.hunks.map((hunk) => hunk.id)).size ||
        file.hunks.some(
          (hunk) =>
            !identifier(hunk.id) ||
            !sameDocumentIdentity(hunk.target, file.target!) ||
            (hunk.target.digest !== undefined && !identifier(hunk.target.digest)),
        )
      )
        return 'Hunk identifiers or targets are invalid or ambiguous.';
      const result = applyTextEdits(
        { ...file.target, text: file.before },
        file.target,
        file.hunks.map((hunk) => ({ range: hunk.target.range, insert: hunk.insert })),
      );
      if (!result.ok || result.text !== file.after)
        return 'Hunk ranges overlap, are invalid, or do not match the reviewed comparison.';
    }
    if (
      review.policy.stage === 'pending' &&
      !review.currentTargets.some((current) => sameDocumentIdentity(current, file.target!))
    )
      return 'The base version changed. Refresh this proposal.';
  }
  if (review.policy.stage === 'saved') {
    const policy = review.policy;
    if (
      !identifier(policy.commandId) ||
      policy.targets.length > 50 ||
      policy.targets.length !== new Set(policy.targets.map((target) => target.documentId)).size ||
      policy.targets.some(
        (target) =>
          !identity(target) ||
          !!target.range ||
          (target.digest !== undefined && !identifier(target.digest)) ||
          !documents.has(target.documentId) ||
          (policy.undo === 'available' &&
            !review.currentTargets.some((current) => sameDocumentIdentity(current, target))),
      )
    )
      return 'The saved revision changed. Refresh before requesting undo.';
  }
}

export function reviewCommandReady(
  command: ReviewCommand | undefined,
  action: ReviewCommand['action'],
  files: readonly ReviewFileSelection[],
  baseVersion: string,
  proposalVersion: string,
  review: ReviewChangesContract,
): command is ReviewCommand {
  if (
    !command ||
    !identifier(command.commandId) ||
    command.action !== action ||
    !sameDocumentIdentity(command.target, review.proposal) ||
    command.baseVersion !== baseVersion ||
    command.proposalVersion !== proposalVersion ||
    !files.length ||
    files.length > 50 ||
    review.completedCommandIds?.includes(command.commandId) ||
    (review.submission.status !== 'idle' &&
      review.submission.command.commandId === command.commandId)
  )
    return false;
  if (action !== 'undo')
    return review.policy.stage === 'pending' && !command.undoOf && sameFiles(command.files, files);
  if (
    review.policy.stage !== 'saved' ||
    review.policy.undo !== 'available' ||
    command.undoOf !== review.policy.commandId ||
    command.commandId === review.policy.commandId
  )
    return false;
  const targets = review.policy.targets;
  if (files.some((file) => !targets.some((target) => target.documentId === file.target.documentId)))
    return false;
  return sameFiles(
    command.files,
    files.map((file) => ({
      id: file.id,
      target: targets.find((target) => target.documentId === file.target.documentId)!,
    })),
  );
}

export function reviewOriginalMatches(
  command: ReviewCommand,
  changes: readonly ProposedChange[],
  baseVersion: string,
  proposalVersion: string,
  review: ReviewChangesContract,
): boolean {
  return (
    identifier(command.commandId) &&
    sameDocumentIdentity(command.target, review.proposal) &&
    command.baseVersion === baseVersion &&
    command.proposalVersion === proposalVersion &&
    ['apply', 'discard', 'undo'].includes(command.action) &&
    command.files.length > 0 &&
    command.files.length <= 50 &&
    command.files.length === new Set(command.files.map((file) => file.id)).size &&
    (command.action === 'undo'
      ? review.policy.stage === 'saved' && command.undoOf === review.policy.commandId
      : !command.undoOf) &&
    command.files.every((file) => {
      const proposed = changes.find((item) => item.id === file.id);
      const target =
        command.action === 'undo' && review.policy.stage === 'saved'
          ? review.policy.targets.find((item) => item.documentId === proposed?.target?.documentId)
          : proposed?.target;
      return (
        !!target &&
        sameReviewTarget(file.target, target) &&
        (!file.hunkIds ||
          (command.action !== 'undo' &&
            file.hunkIds.length > 0 &&
            file.hunkIds.length <= 50 &&
            file.hunkIds.length === new Set(file.hunkIds).size &&
            file.hunkIds.every((id) => proposed?.hunks?.some((hunk) => hunk.id === id))))
      );
    })
  );
}

export function reviewReceiptValid(original: ReviewCommand, receipt: ReviewReceipt): boolean {
  return (
    sameReviewCommand(original, receipt.command) &&
    receipt.files.length <= 50 &&
    receipt.files.length === new Set(receipt.files.map((file) => file.id)).size &&
    receipt.files.every((file) => {
      const expected = original.files.find((item) => item.id === file.id);
      return (
        !!expected &&
        sameFiles([expected], [file]) &&
        (file.result === 'unknown' ||
          (file.result === 'applied' && identifier(file.nextVersion)) ||
          (file.result === 'rejected' && typeof file.reason === 'string' && !!file.reason.trim()))
      );
    })
  );
}
