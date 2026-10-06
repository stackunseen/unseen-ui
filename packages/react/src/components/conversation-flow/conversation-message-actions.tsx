'use client';
import { useRef } from 'react';
import { MessageActions } from '../message/message.js';
import type {
  ConversationActionCommand,
  ConversationActionState,
  ConversationMessageSnapshot,
  ConversationMessageTarget,
  MessageRegenerateCommand,
} from './contracts.js';
import {
  conversationActionReason,
  inspectConversationAction,
  inspectConversationActionState,
  sameConversationTarget,
} from './contracts.js';
import { ConversationActionStatus } from './action-status.js';

export interface ConversationMessageActionsProps {
  target: ConversationMessageTarget;
  current: ConversationMessageSnapshot;
  state: ConversationActionState;
  regenerateCommand?: MessageRegenerateCommand;
  onEdit?: (target: ConversationMessageTarget) => void;
  onRegenerate?: (command: MessageRegenerateCommand) => void;
  onReconcile?: (original: ConversationActionCommand) => void;
  disabledReason?: string;
}
export function ConversationMessageActions({
  target,
  current,
  state,
  regenerateCommand,
  onEdit,
  onRegenerate,
  onReconcile,
  disabledReason,
}: ConversationMessageActionsProps) {
  const submitted = useRef<string | undefined>(undefined);
  const submission = inspectConversationActionState(state);
  const editReason =
    disabledReason ||
    (!sameConversationTarget(target, current)
      ? 'Message revision or conversation scope changed.'
      : !submission || submission.status === 'pending' || submission.status === 'unknown'
        ? 'Reconcile the existing action before editing.'
        : undefined);
  const regenerateReason =
    disabledReason || conversationActionReason(target, current, regenerateCommand, state);
  const command = inspectConversationAction(regenerateCommand);
  return (
    <>
      <MessageActions
        text={current.text}
        onEdit={
          target.role === 'user' && onEdit
            ? () => {
                if (!editReason) onEdit({ ...target });
              }
            : undefined
        }
        editAvailability={{ available: !editReason, reason: editReason }}
        onRetry={
          target.role === 'assistant' && onRegenerate
            ? () => {
                if (
                  regenerateReason ||
                  command?.kind !== 'regenerate' ||
                  submitted.current === command.commandId
                )
                  return;
                submitted.current = command.commandId;
                onRegenerate(command);
              }
            : undefined
        }
        retryLabel="Regenerate"
        retryAvailability={{ available: !regenerateReason, reason: regenerateReason }}
      />
      <ConversationActionStatus state={state} onReconcile={onReconcile} />
    </>
  );
}
