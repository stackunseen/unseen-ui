'use client';
import { useId } from 'react';
import { PlayIcon } from '@radix-ui/react-icons';
import s from '../../shared/styles/media.module.css';

export interface VoiceOption {
  id: string;
  name: string;
  description?: string;
  /** Host-reported reason this voice is unavailable. */
  disabledReason?: string;
}
export interface VoiceSelectorProps {
  voices: readonly VoiceOption[];
  value: string;
  onValueChange: (id: string) => void;
  /** Asks the host to play a short sample. */
  onPreview?: (id: string) => void;
  label?: string;
  className?: string;
}

/** Choose a speech voice. The host plays samples and applies the choice. */
export function VoiceSelector({
  voices,
  value,
  onValueChange,
  onPreview,
  label = 'Voice',
  className = '',
}: VoiceSelectorProps) {
  const id = useId();
  return (
    <fieldset className={`${s.root} ${s.voices} ${className}`} data-part="voice-selector">
      <legend>{label}</legend>
      {voices.length === 0 && <p className={s.meta}>No voices available.</p>}
      {voices.map((voice) => (
        <label key={voice.id} className={s.voice}>
          <input
            type="radio"
            name={`${id}-voice`}
            value={voice.id}
            checked={voice.id === value}
            disabled={!!voice.disabledReason}
            onChange={() => onValueChange(voice.id)}
          />
          <span className={s.grow}>
            {voice.name}
            {(voice.description || voice.disabledReason) && (
              <span className={s.meta}>{voice.disabledReason ?? voice.description}</span>
            )}
          </span>
          {onPreview && !voice.disabledReason && (
            <button
              type="button"
              className={s.iconButton}
              aria-label={`Play ${voice.name} sample`}
              onClick={(event) => {
                event.preventDefault();
                onPreview(voice.id);
              }}
            >
              <PlayIcon aria-hidden="true" />
            </button>
          )}
        </label>
      ))}
    </fieldset>
  );
}
