'use client';
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
export interface TranscriptionProps {
  segments: readonly TranscriptSegment[];
  /** Current playback time in seconds; highlights the active segment. */
  currentTime?: number;
  /** Seeks the host's player to a segment. */
  onSeek?: (seconds: number) => void;
  label?: string;
  className?: string;
}

/** A timed transcript that follows playback and can seek to a segment. */
export function Transcription({
  segments,
  currentTime,
  onSeek,
  label = 'Transcript',
  className = '',
}: TranscriptionProps) {
  return (
    <div className={`${s.root} ${className}`} data-part="transcription">
      <ol className={s.segments} aria-label={label}>
        {segments.length === 0 && <li className={s.meta}>No transcript yet.</li>}
        {segments.map((segment) => {
          const active =
            currentTime !== undefined && currentTime >= segment.start && currentTime < segment.end;
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
    </div>
  );
}
