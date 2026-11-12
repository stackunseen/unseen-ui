'use client';
import { type ComponentProps, useEffect, useRef } from 'react';
import { formatTime } from '../audio-player/audio-player.js';
import s from '../../shared/styles/media.module.css';

export interface TranscriptSegment {
  id: string;
  /** Start and end in seconds, as reported by the transcription provider. */
  start: number;
  end: number;
  text: string;
  speaker?: string;
}
export interface TranscriptionProps extends ComponentProps<'div'> {
  segments: readonly TranscriptSegment[];
  /** Current playback time in seconds; highlights the active segment. */
  currentTime?: number;
  /** Seeks the host's player to a segment. */
  onSeek?: (seconds: number) => void;
  /**
   * Keeps the segment being played in view as playback moves on. It scrolls only the nearest
   * scrolling container, and never while the person is using a control inside the transcript.
   */
  follow?: boolean;
  /**
   * `in-progress` while the host is still transcribing: more segments may arrive.
   * `unavailable` when the host could not produce a transcript.
   */
  status?: 'complete' | 'in-progress' | 'unavailable';
  label?: string;
  /** Shown while there are no segments. */
  emptyLabel?: string;
  /** Shown after the last segment while `status` is `in-progress`. */
  inProgressLabel?: string;
  /** Shown when `status` is `unavailable`. */
  unavailableLabel?: string;
  className?: string;
}

/** A timed transcript that follows playback and can seek to a segment. */
export function Transcription({
  segments,
  currentTime,
  onSeek,
  follow = false,
  status = 'complete',
  label = 'Transcript',
  emptyLabel = 'No transcript yet.',
  inProgressLabel = 'Transcribing…',
  unavailableLabel = 'No transcript is available for this recording.',
  className = '',
  ...rest
}: TranscriptionProps) {
  const list = useRef<HTMLOListElement>(null);
  const activeId =
    currentTime === undefined
      ? undefined
      : segments.find((segment) => currentTime >= segment.start && currentTime < segment.end)?.id;
  useEffect(() => {
    const element = list.current;
    if (!follow || activeId === undefined || !element) return;
    // A person tabbing or pressing inside the transcript keeps their place.
    if (element.contains(document.activeElement)) return;
    element.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [follow, activeId]);
  const inProgress = status === 'in-progress';
  return (
    <div
      {...rest}
      className={`${s.root} ${className}`}
      data-part="transcription"
      data-status={status}
      aria-busy={inProgress || undefined}
    >
      <ol ref={list} className={s.segments} aria-label={label}>
        {segments.length === 0 && !inProgress && (
          <li className={s.meta}>{status === 'unavailable' ? unavailableLabel : emptyLabel}</li>
        )}
        {segments.map((segment) => {
          const active = segment.id === activeId;
          const content = (
            <>
              <span className={s.time}>{formatTime(segment.start)}</span>
              <span>
                {segment.speaker && <span className={s.speaker}>{segment.speaker}: </span>}
                {segment.text}
              </span>
            </>
          );
          return (
            <li key={segment.id}>
              {onSeek ? (
                <button
                  type="button"
                  className={s.segment}
                  aria-current={active || undefined}
                  onClick={() => onSeek(segment.start)}
                >
                  {content}
                </button>
              ) : (
                <div className={s.segment} aria-current={active || undefined}>
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <p role="status" className={inProgress ? s.segmentNote : s.srOnly}>
        {inProgress ? inProgressLabel : ''}
      </p>
      {status === 'unavailable' && segments.length > 0 && (
        <p className={s.segmentNote}>{unavailableLabel}</p>
      )}
    </div>
  );
}
