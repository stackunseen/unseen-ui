'use client';
import { useId } from 'react';
import type { FormEvent } from 'react';
import type { CommandReceipt, SubmissionState } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { Checkbox } from '../checkbox/checkbox.js';
import { Textarea } from '../textarea/textarea.js';
import { Panel } from '../panel/panel.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import own from './trust.module.css';
import ac from '../../shared/styles/agent-controls.module.css';

/** What the feedback is about, by exact revision or attempt, so the host never files it elsewhere. */
export type FeedbackTarget =
  { messageId: string; revision: number } | { runId: string; attemptId: string };
export interface FeedbackDraft {
  helpful: boolean | null;
  reasons: readonly string[];
  correction: string;
}
export interface FeedbackSubmission extends FeedbackDraft {
  target: FeedbackTarget;
}
export interface FeedbackReason {
  id: string;
  label: string;
}
export const emptyFeedbackDraft: FeedbackDraft = { helpful: null, reasons: [], correction: '' };
export const defaultFeedbackReasons: readonly FeedbackReason[] = [
  { id: 'inaccurate', label: 'Inaccurate' },
  { id: 'incomplete', label: 'Incomplete' },
  { id: 'off-topic', label: 'Off topic' },
  { id: 'unsafe', label: 'Unsafe or inappropriate' },
  { id: 'style', label: 'Tone or formatting' },
];

export interface FeedbackCaptureProps extends VariantProps<'FeedbackCapture'> {
  target: FeedbackTarget;
  value: FeedbackDraft;
  onValueChange: (value: FeedbackDraft) => void;
  /** Receives the draft bound to the target. The host stores it and answers with a receipt. */
  onSubmit: (submission: FeedbackSubmission) => void;
  reasons?: readonly FeedbackReason[];
  submission?: SubmissionState;
  receipt?: CommandReceipt;
  maxLength?: number;
  label?: string;
}

const statusText: Record<SubmissionState, string> = {
  idle: '',
  submitting: 'Sending feedback…',
  acknowledged: 'Feedback recorded by the host.',
  failed: 'Feedback was not recorded. You can send it again.',
  'outcome-unknown': 'The host did not confirm. Check before sending again.',
};

/** Thumbs, reasons and a correction, bound to one revision or attempt, settled by a host receipt. */
export function FeedbackCapture({
  target,
  value,
  onValueChange,
  onSubmit,
  reasons = defaultFeedbackReasons,
  submission = 'idle',
  receipt,
  maxLength = 2000,
  label = 'Was this helpful?',
  variant = 'card',
}: FeedbackCaptureProps) {
  const id = useId();
  const locked = submission === 'submitting' || submission === 'acknowledged';
  const correction = value.correction.slice(0, maxLength);
  function choose(helpful: boolean) {
    if (locked) return;
    onValueChange({
      ...value,
      helpful: value.helpful === helpful ? null : helpful,
      reasons: helpful ? [] : value.reasons,
    });
  }
  function toggle(reason: string) {
    if (locked) return;
    onValueChange({
      ...value,
      reasons: value.reasons.includes(reason)
        ? value.reasons.filter((item) => item !== reason)
        : [...value.reasons, reason],
    });
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (locked || value.helpful === null) return;
    onSubmit({
      target,
      helpful: value.helpful,
      reasons: reasons.map((r) => r.id).filter((r) => value.reasons.includes(r)),
      correction: correction.trim(),
    });
  }
  const body = (
    <form onSubmit={submit} className={own.stack} aria-labelledby={`${id}-label`}>
      <strong id={`${id}-label`}>{label}</strong>
      <div className={s.actions} role="group" aria-label="Helpfulness">
        <Button
          type="button"
          size="sm"
          variant={value.helpful === true ? 'secondary' : 'outline'}
          aria-pressed={value.helpful === true}
          disabled={locked}
          onClick={() => choose(true)}
        >
          <AIIcon name="helpful" />
          Helpful
        </Button>
        <Button
          type="button"
          size="sm"
          variant={value.helpful === false ? 'secondary' : 'outline'}
          aria-pressed={value.helpful === false}
          disabled={locked}
          onClick={() => choose(false)}
        >
          <AIIcon name="unhelpful" />
          Not helpful
        </Button>
      </div>
      {value.helpful === false && (
        <fieldset className={s.fieldset}>
          <legend className={s.muted}>What went wrong?</legend>
          <div className={own.stack}>
            {reasons.map((reason) => (
              <label key={reason.id} className={ac.row}>
                <Checkbox
                  checked={value.reasons.includes(reason.id)}
                  disabled={locked}
                  onCheckedChange={() => toggle(reason.id)}
                />
                <span>{reason.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {value.helpful !== null && (
        <label className={own.stack}>
          <span className={s.muted}>
            {value.helpful ? 'Anything to add? (optional)' : 'What should it have said? (optional)'}
          </span>
          <Textarea
            value={correction}
            maxLength={maxLength}
            rows={3}
            disabled={locked}
            onChange={(event) => onValueChange({ ...value, correction: event.target.value })}
          />
        </label>
      )}
      {value.helpful !== null && (
        <div className={s.actions}>
          <Button type="submit" size="sm" disabled={locked}>
            {submission === 'acknowledged' ? 'Sent' : 'Send feedback'}
          </Button>
        </div>
      )}
      <p role="status" className={submission === 'failed' ? s.error : s.muted}>
        {statusText[submission]}
        {receipt?.message ? ` ${receipt.message}` : ''}
      </p>
    </form>
  );
  const attributes = {
    'data-part': 'feedback-capture',
    'data-variant': variant,
    'data-submission': submission,
  } as const;
  return variant === 'card' ? (
    <Panel {...attributes}>{body}</Panel>
  ) : (
    <div {...attributes}>{body}</div>
  );
}
