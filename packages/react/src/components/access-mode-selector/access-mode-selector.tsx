'use client';
import { useId, useState } from 'react';
import { Button } from '../button/button.js';
import { Select } from '../select/select.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/agent-controls.module.css';
import a from '../../shared/styles/action-layout.module.css';

export interface AccessMode {
  id: string;
  label: string;
  description: string;
  disabledReason?: string;
}

export interface AccessModeSelectorProps extends VariantProps<'AccessModeSelector'> {
  modes: readonly AccessMode[];
  value?: string;
  scope: string;
  version: string;
  status: 'ready' | 'pending' | 'error' | 'stale';
  error?: string;
  onRequest: (request: { modeId: string; scope: string; version: string }) => void;
}

export function AccessModeSelector({
  modes,
  value,
  scope,
  version,
  status,
  error,
  onRequest,
  variant = 'cards',
}: AccessModeSelectorProps) {
  const id = useId();
  const [draft, setDraft] = useState<{ modeId: string; scope: string; version: string }>();
  const draftStale = !!draft && (draft.scope !== scope || draft.version !== version);
  const selected = modes.find(
    (mode) => mode.id === (draftStale ? value : (draft?.modeId ?? value)),
  );
  const chooseMode = (modeId: string) => setDraft({ modeId, scope, version });
  const locked = status === 'pending' || status === 'stale' || !scope.trim() || !version.trim();
  return (
    <div
      className={`${s.root} ${variant === 'cards' ? s.surface : ''}`}
      data-part="access-mode"
      data-variant={variant}
    >
      <div className={s.header}>
        <strong id={id}>Agent access</strong>
        <span className={s.tag}>
          Current: {modes.find((mode) => mode.id === value)?.label ?? 'Unknown'}
        </span>
      </div>
      <p className={s.muted}>
        {scope || 'Scope not supplied'} · Policy {version || 'unknown'}
      </p>
      {variant === 'select' ? (
        <Select
          aria-labelledby={id}
          value={selected?.id ?? ''}
          onValueChange={chooseMode}
          disabled={locked}
          options={modes.map((mode) => ({
            value: mode.id,
            label: mode.label,
            disabled: !!mode.disabledReason,
          }))}
        />
      ) : (
        <fieldset className={s.fieldset} disabled={locked}>
          <legend className={s.muted}>Requested mode</legend>
          <div className={s.options}>
            {modes.map((mode) => (
              <label className={s.choice} key={mode.id}>
                <input
                  type="radio"
                  name={id}
                  checked={selected?.id === mode.id}
                  disabled={!!mode.disabledReason}
                  onChange={() => chooseMode(mode.id)}
                />
                <span>
                  <strong>{mode.label}</strong>
                  <small className={s.muted}>{mode.disabledReason ?? mode.description}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {variant === 'select' && selected && (
        <p className={s.muted}>{selected.disabledReason ?? selected.description}</p>
      )}
      <div className={a.footer} role="group" aria-label="Access change request">
        <Button
          disabled={
            locked || draftStale || !selected || !!selected.disabledReason || selected.id === value
          }
          onClick={() => {
            if (
              !locked &&
              !draftStale &&
              selected &&
              !selected.disabledReason &&
              selected.id !== value
            )
              onRequest({ modeId: selected.id, scope, version });
          }}
        >
          {status === 'pending' ? 'Awaiting confirmation' : 'Request access change'}
        </Button>
      </div>
      {status === 'error' && (
        <p role="alert" className={s.error}>
          {error || 'The access change was not confirmed.'}
        </p>
      )}
      {status === 'stale' && (
        <p role="status" className={s.warning}>
          Policy changed. Refresh before requesting access.
        </p>
      )}
      {draftStale && status !== 'stale' && (
        <p role="status" className={s.warning}>
          Scope or policy changed. Choose a mode again before requesting access.
        </p>
      )}
    </div>
  );
}
