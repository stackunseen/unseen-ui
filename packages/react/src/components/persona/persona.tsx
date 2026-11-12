import type { ComponentProps, CSSProperties } from 'react';
import s from '../../shared/styles/media.module.css';

export type PersonaState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'asleep';
export interface PersonaProps extends ComponentProps<'div'> {
  /** Host-reported voice agent state. */
  state: PersonaState;
  /** Agent name, used in the accessible description. */
  name?: string;
  size?: number;
  /** Show the state as visible text below the orb. */
  showLabel?: boolean;
  className?: string;
}

const labels: Record<PersonaState, string> = {
  idle: 'Ready',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  asleep: 'Inactive',
};

/** An animated presence for voice agents. Motion stops under reduced-motion preferences. */
export function Persona({
  state,
  name = 'Assistant',
  size = 64,
  showLabel = true,
  className = '',
  style,
  ...rest
}: PersonaProps) {
  return (
    <div
      {...rest}
      className={`${s.root} ${s.persona} ${className}`}
      data-part="persona"
      data-state={state}
      style={{ ...style, '--ai-persona-size': `${size}px` } as CSSProperties}
    >
      <span className={s.orb} aria-hidden="true" />
      <span role="status" className={showLabel ? s.meta : s.srOnly}>
        {showLabel ? labels[state] : `${name}: ${labels[state]}`}
      </span>
    </div>
  );
}
