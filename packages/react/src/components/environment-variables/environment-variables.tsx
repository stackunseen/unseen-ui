'use client';
import { useState } from 'react';
import { CopyIcon, EyeClosedIcon, EyeOpenIcon } from '@radix-ui/react-icons';
import { useCopy } from '../../shared/copy.js';
import s from '../../shared/styles/devtools.module.css';

export interface EnvironmentVariable {
  name: string;
  /**
   * The value the host chooses to show. For secrets, prefer passing a masked or omitted value;
   * this component never fetches values itself.
   */
  value?: string;
  secret?: boolean;
}
export interface EnvironmentVariablesProps {
  variables: readonly EnvironmentVariable[];
  title?: string;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

/** Lists environment variables; secret values stay masked until the person reveals them. */
export function EnvironmentVariables({
  variables,
  title = 'Environment variables',
  headingLevel = 3,
  className = '',
}: EnvironmentVariablesProps) {
  const Heading = `h${headingLevel}` as const;
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  const { copy, message } = useCopy();
  const toggle = (name: string) =>
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  return (
    <section className={`${s.root} ${className}`} data-part="environment-variables">
      <div className={s.header}>
        <Heading className={s.title}>{title}</Heading>
        <span className={s.meta}>{variables.length} defined</span>
      </div>
      {variables.length === 0 ? (
        <p className={s.notice}>No variables reported.</p>
      ) : (
        <ul className={s.list}>
          {variables.map((variable) => {
            const hidden = variable.secret && !revealed.has(variable.name);
            const value = variable.value ?? '';
            return (
              <li key={variable.name}>
                <span className={`${s.mono} ${s.grow}`}>{variable.name}</span>
                <span className={s.mono}>
                  {variable.value === undefined
                    ? 'Not shown'
                    : hidden
                      ? '•'.repeat(Math.min(12, Math.max(6, value.length)))
                      : value}
                </span>
                <span className={s.actions}>
                  {variable.secret && variable.value !== undefined && (
                    <button
                      type="button"
                      className={s.iconButton}
                      aria-pressed={!hidden}
                      aria-label={`${hidden ? 'Show' : 'Hide'} ${variable.name}`}
                      onClick={() => toggle(variable.name)}
                    >
                      {hidden ? (
                        <EyeOpenIcon aria-hidden="true" />
                      ) : (
                        <EyeClosedIcon aria-hidden="true" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    className={s.iconButton}
                    aria-label={`Copy ${variable.name} name`}
                    onClick={() => void copy(variable.name)}
                  >
                    <CopyIcon aria-hidden="true" />
                  </button>
                  <span role="status" className={message(variable.name) ? s.meta : s.srOnly}>
                    {message(variable.name)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
