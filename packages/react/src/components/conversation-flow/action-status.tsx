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
  if (!inspected) text = 'Host action outcome is invalid or unavailable.';
  else if (inspected.status === 'pending') text = 'Waiting for host acknowledgement.';
  else if (inspected.status === 'unknown')
    text = 'Action outcome is unknown. Check the original request; do not repeat it.';
  else if (inspected.status === 'settled')
    text =
      inspected.receipt.result === 'rejected'
        ? `Host rejected the action: ${inspected.receipt.reason}`
        : inspected.receipt.command.kind === 'edit'
          ? 'Host acknowledged a new conversation branch.'
          : 'Host acknowledged a new response attempt.';
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
