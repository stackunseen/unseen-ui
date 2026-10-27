'use client';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import type { Run, SubmissionState } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import { Textarea } from '../textarea/textarea.js';
import type { VariantProps } from '../../shared/variants.js';
import { formatTime } from './shared.js';
import s from '../../shared/styles/styles.module.css';
import r from './runs.module.css';

export type SteeringNoteStatus = 'queued' | 'acknowledged' | 'applied' | 'rejected';
export interface SteeringNote {
  id: string;
  text: string;
  at: string;
  /** Reported by the host: queued until the run reads it, applied when a step used it. */
  status: SteeringNoteStatus;
  /** Why the host rejected it, or which step applied it. */
  detail?: string;
}
export interface SteeringRequest {
  runId: string;
  /** The run version the note was written against; the host rejects it if the run moved on. */
  runVersion: number;
  text: string;
}
export interface AgentSteeringProps extends VariantProps<'AgentSteering'> {
  run: Run;
  /** Notes the host holds for this run, newest last. */
  notes: readonly SteeringNote[];
  onSubmit: (request: SteeringRequest) => void;
  /** State of the last submission; the composer clears only on acknowledgement. */
  submission?: SubmissionState;
  /** Why no note can be sent now, such as "The run has finished". */
  disabledReason?: string;
  maxLength?: number;
  locale?: string;
  timeZone?: string;
  label?: string;
  placeholder?: string;
}

const statusLabels: Record<SteeringNoteStatus, { label: string; state: string }> = {
  queued: { label: 'Queued for the next step', state: 'pending' },
  acknowledged: { label: 'Received', state: 'running' },
  applied: { label: 'Applied', state: 'succeeded' },
  rejected: { label: 'Not applied', state: 'failed' },
};
const submissionText: Partial<Record<SubmissionState, string>> = {
  submitting: 'Sending…',
  acknowledged: 'Received. It applies from the next step.',
  failed: 'Not sent. Try again.',
  'outcome-unknown': 'Sent, but no confirmation arrived. Check the notes before sending it again.',
};

/**
 * Steer a running agent without stopping it: queue a note for its next step. The note carries the
 * run version it was written against, so a run that has moved on can reject it, and every note
 * shows the status the host reports rather than assuming it was read.
 */
export function AgentSteering({
  variant = 'panel',
  run,
  notes,
  onSubmit,
  submission = 'idle',
  disabledReason,
  maxLength = 2000,
  locale,
  timeZone,
  label = 'Steer this run',
  placeholder = 'Tell the agent what to do differently from the next step on…',
}: AgentSteeringProps) {
  const id = useId();
  const [text, setText] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const finished = ['succeeded', 'failed', 'cancelled'].includes(run.lifecycle);
  const blocked =
    disabledReason ?? (finished ? 'The run has finished; notes cannot be applied.' : undefined);
  const busy = submission === 'submitting';
  // The draft clears once the host has the note; a failed or unknown send keeps it for retry.
  if (submission === 'acknowledged' && sent !== null && text === sent) {
    setText('');
    setSent(null);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || blocked || busy) return;
    setSent(text);
    onSubmit({ runId: run.id, runVersion: run.version, text: trimmed });
  }
  const list = notes.length ? (
    <ol className={r.steeringNotes} aria-label="Notes sent to this run">
      {notes.map((note) => (
        <li key={note.id} className={r.steeringNote} data-status={note.status}>
          <p className={r.steeringText}>{note.text}</p>
          <div className={r.cardMeta}>
            <StatusBadge
              state={statusLabels[note.status].state}
              label={statusLabels[note.status].label}
            />
            <span>{formatTime(note.at, locale, timeZone)}</span>
            {note.detail && <span>{note.detail}</span>}
          </div>
        </li>
      ))}
    </ol>
  ) : (
    <p className={s.muted}>No notes yet. The agent keeps following its plan.</p>
  );
  return (
    <section
      className={variant === 'panel' ? `${s.panel} ${r.steering}` : r.steering}
      data-part="agent-steering"
      data-variant={variant}
      aria-labelledby={`${id}-title`}
    >
      <div className={s.row}>
        <strong id={`${id}-title`}>{label}</strong>
        <span className={s.muted}>
          Run {run.id} · version {run.version}
        </span>
      </div>
      {list}
      <form className={r.steeringForm} onSubmit={submit}>
        <label className={s.srOnly} htmlFor={`${id}-note`}>
          Note for the next step
        </label>
        <Textarea
          id={`${id}-note`}
          value={text}
          rows={2}
          maxLength={maxLength}
          placeholder={placeholder}
          disabled={Boolean(blocked) || busy}
          aria-describedby={`${id}-status`}
          onChange={(event) => setText(event.target.value)}
        />
        <div className={s.row}>
          <span id={`${id}-status`} className={s.muted} role="status">
            {blocked ?? submissionText[submission] ?? `${text.length}/${maxLength}`}
          </span>
          <Button type="submit" size="sm" disabled={Boolean(blocked) || busy || !text.trim()}>
            {busy ? 'Sending…' : 'Send to the next step'}
          </Button>
        </div>
      </form>
    </section>
  );
}
