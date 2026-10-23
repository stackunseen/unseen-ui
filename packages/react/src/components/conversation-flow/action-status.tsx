'use client';
import { Button } from '../button/button.js';
import type { ConversationActionCommand, ConversationActionState } from './contracts.js';
import { inspectConversationActionState } from './contracts.js';
import s from './conversation-flow.module.css';

export function ConversationActionStatus({
  state,
  onReconcile,
}: {
  state: ConversationActionState;
  onReconcile?: (original: ConversationActionCommand) => void;
}) {
  const inspected = inspectConversationActionState(state);
  let text: string | undefined;
  if (!inspected) text = 'The result of this action isn’t available.';
  else if (inspected.status === 'pending') text = 'Waiting for confirmation.';
  else if (inspected.status === 'unknown')
    text = 'Action outcome is unknown. Check the original request; do not repeat it.';
  else if (inspected.status === 'settled')
    text =
      inspected.receipt.result === 'rejected'
        ? `Action rejected: ${inspected.receipt.reason}`
        : inspected.receipt.command.kind === 'edit'
          ? 'New conversation branch created.'
          : 'New response started.';
  return (
    <>
      <p role="status" className={s.status}>
        {text}
      </p>
      {inspected?.status === 'unknown' && onReconcile && (
        <Button size="sm" variant="outline" onClick={() => onReconcile(inspected.command)}>
          Check original request
        </Button>
      )}
    </>
  );
}
