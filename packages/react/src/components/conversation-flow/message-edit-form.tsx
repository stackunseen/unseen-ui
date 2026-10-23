'use client';
import { useEffect, useId, useRef } from 'react';
import type { RefObject } from 'react';
import type { DocumentSnapshot } from '@stackunseen/ui-core/editing';
import { Button } from '../button/button.js';
import { Textarea } from '../textarea/textarea.js';
import { sameDecision } from '../../shared/decision-contracts.js';
import type {
  ConversationActionCommand,
  ConversationActionState,
  ConversationMessageSnapshot,
  ConversationMessageTarget,
  MessageEditCommand,
} from './contracts.js';
import {
  conversationActionReason,
  inspectConversationAction,
  inspectConversationActionState,
  sameConversationScope,
  sameConversationTarget,
} from './contracts.js';
import { ConversationActionStatus } from './action-status.js';
import s from './conversation-flow.module.css';

export interface MessageEditFormProps {
  target: ConversationMessageTarget;
  current: ConversationMessageSnapshot;
  draft: DocumentSnapshot;
  command?: MessageEditCommand;
  state: ConversationActionState;
  onDraftChange: (text: string) => void;
  onRequest: (command: MessageEditCommand) => void;
  /** Closes the editor; does not cancel an already submitted command or discard the host draft. */
  onCancel: (target: ConversationMessageTarget, draft: DocumentSnapshot) => void;
  onReconcile?: (original: ConversationActionCommand) => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
  autoFocus?: boolean;
  disabledReason?: string;
  className?: string;
}
export function MessageEditForm({
  target,
  current,
  draft,
  command,
  state,
  onDraftChange,
  onRequest,
  onCancel,
  onReconcile,
  returnFocusRef,
  autoFocus = true,
  disabledReason,
  className = '',
}: MessageEditFormProps) {
  const id = useId(),
    input = useRef<HTMLTextAreaElement>(null),
    submitted = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (autoFocus) input.current?.focus();
    const origin = returnFocusRef?.current;
    return () => {
      if (origin?.isConnected) origin.focus();
    };
  }, [autoFocus, returnFocusRef]);
  const inspected = inspectConversationAction(command);
  const visible = sameConversationScope(target, current);
  const boundDraft = inspected?.kind === 'edit' && sameDecision(inspected.draft, draft);
  const reason =
    disabledReason ||
    conversationActionReason(target, current, command, state) ||
    (!boundDraft ? 'The action does not match this draft revision.' : undefined);
  const ready = visible && !reason;
  const submission = inspectConversationActionState(state);
  const editable =
    !disabledReason &&
    sameConversationTarget(target, current) &&
    !!submission &&
    submission.status !== 'pending' &&
    submission.status !== 'unknown';
  const boundedDraft = typeof draft.text === 'string' && draft.text.length <= 20_000;
  function cancel() {
    onCancel(target, draft);
    if (returnFocusRef?.current?.isConnected) returnFocusRef.current.focus();
  }
  function submit() {
    if (!ready || inspected?.kind !== 'edit' || submitted.current === inspected.commandId) return;
    submitted.current = inspected.commandId;
    onRequest(inspected);
  }
  return (
    <form
      className={`${s.editor} ${className}`}
      data-part="message-edit-form"
      aria-label="Edit message"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.nativeEvent.isComposing && event.keyCode !== 229) {
          event.preventDefault();
          event.stopPropagation();
          cancel();
        }
      }}
    >
      {visible && boundedDraft ? (
        <>
          <label htmlFor={id}>Edit message</label>
          <Textarea
            ref={input}
            id={id}
            value={draft.text}
            maxLength={20_000}
            readOnly={!editable}
            aria-describedby={`${id}-help`}
            onChange={(event) => {
              if (editable) onDraftChange(event.target.value);
            }}
          />
        </>
      ) : (
        <p className={s.status}>This draft is unavailable in the current conversation.</p>
      )}
      <p id={`${id}-help`} className={s.status}>
        {reason ||
          'Saving creates a new branch once it’s confirmed. The original message stays available.'}
      </p>
      <ConversationActionStatus state={state} onReconcile={onReconcile} />
      <div className={s.actions}>
        <Button size="sm" variant="outline" onClick={cancel}>
          {state.status === 'pending' || state.status === 'unknown' ? 'Close editor' : 'Cancel'}
        </Button>
        <Button size="sm" type="submit" disabled={!ready}>
          Save as new branch
        </Button>
      </div>
    </form>
  );
}
