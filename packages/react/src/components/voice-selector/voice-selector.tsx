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
  /** Replaces the built-in wording, for example to translate it. */
  labels?: Partial<VoiceSelectorLabels>;
  className?: string;
}
export interface VoiceSelectorLabels {
  empty: string;
  playSample: (voice: string) => string;
}
const defaultLabels: VoiceSelectorLabels = {
  empty: 'No voices available.',
  playSample: (voice) => `Play ${voice} sample`,
};

/** Choose a speech voice. The host plays samples and applies the choice. */
export function VoiceSelector({
  voices,
  value,
  onValueChange,
  onPreview,
  label = 'Voice',
  labels,
  className = '',
}: VoiceSelectorProps) {
  const text = { ...defaultLabels, ...labels };
  const id = useId();
  return (
    <fieldset className={`${s.root} ${s.voices} ${className}`} data-part="voice-selector">
      <legend>{label}</legend>
      {voices.length === 0 && <p className={s.meta}>{text.empty}</p>}
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
              aria-label={text.playSample(voice.name)}
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
