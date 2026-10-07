'use client';
import { useRef, useState } from 'react';
import { PauseIcon, PlayIcon } from '@radix-ui/react-icons';
import s from '../../shared/styles/media.module.css';

export interface AudioPlayerProps {
  /** Host-supplied audio URL (http(s), blob: or data:audio). */
  src: string;
  /** Accessible name, for example the message or file it belongs to. */
  label: string;
  className?: string;
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function safeAudioSource(src: string) {
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(src)?.[1]?.toLowerCase();
  if (!scheme || ['http', 'https', 'blob'].includes(scheme)) return src;
  return scheme === 'data' && src.startsWith('data:audio/') ? src : undefined;
}

/** A compact player for generated or recorded audio. */
export function AudioPlayer({ src, label, className = '' }: AudioPlayerProps) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(Number.NaN);
  const [error, setError] = useState(false);
  const safe = safeAudioSource(src);
  const unavailable = !safe || error;
  return (
    <div
      className={`${s.root} ${s.player} ${className}`}
      data-part="audio-player"
      role="group"
      aria-label={label}
    >
      <audio
        ref={audio}
        src={safe}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onError={() => setError(true)}
      />
      <button
        type="button"
        className={s.play}
        disabled={unavailable}
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={() => {
          const element = audio.current;
          if (!element) return;
          if (element.paused) void element.play().catch(() => setError(true));
          else element.pause();
        }}
      >
        {playing ? <PauseIcon aria-hidden="true" /> : <PlayIcon aria-hidden="true" />}
      </button>
      <input
        className={s.seek}
        type="range"
        aria-label="Playback position"
        min={0}
        max={Number.isFinite(duration) ? duration : 0}
        step={0.1}
        value={time}
        disabled={unavailable || !Number.isFinite(duration)}
        aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
        onChange={(event) => {
          if (audio.current) audio.current.currentTime = Number(event.target.value);
        }}
      />
      <span className={s.time}>
        {unavailable ? 'Audio unavailable' : `${formatTime(time)} / ${formatTime(duration)}`}
      </span>
    </div>
  );
}
