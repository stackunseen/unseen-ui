'use client';
import type { ReactElement } from 'react';
import { Button } from '../button/button.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/agent-controls.module.css';
import a from '../../shared/styles/action-layout.module.css';
import { ScopedAgentHandoff } from './scoped-agent-handoff.js';
import type { ScopedAgentHandoffProps } from './scoped-agent-handoff.js';
import { stateLabel } from '../../shared/labels.js';

export interface HandoffRequest {
  id: string;
  version: string;
  from: string;
  to: string;
  context: string;
  owner: string;
  state: 'requested' | 'pending' | 'accepted' | 'declined' | 'expired' | 'denied';
  scope: string;
  error?: string;
}

/** @deprecated Supply commandId/submission with a HandoffSnapshot for acknowledged provenance. */
export interface LegacyAgentHandoffProps extends VariantProps<'AgentHandoff'> {
  value: HandoffRequest;
  onDecision: (request: HandoffRequest, decision: 'accept' | 'decline') => void;
}

export type AgentHandoffProps = LegacyAgentHandoffProps | ScopedAgentHandoffProps;

export function AgentHandoff(props: LegacyAgentHandoffProps): ReactElement;

export function AgentHandoff(props: ScopedAgentHandoffProps): ReactElement;

export function AgentHandoff(props: AgentHandoffProps) {
  return 'submission' in props ? (
    <ScopedAgentHandoff {...props} />
  ) : (
    <LegacyAgentHandoff {...props} />
  );
}

function LegacyAgentHandoff({ value, onDecision, variant = 'card' }: LegacyAgentHandoffProps) {
  return (
    <div
      className={`${s.root} ${variant === 'card' ? s.surface : ''}`}
      data-part="agent-handoff"
      data-variant={variant}
    >
      <div className={s.header}>
        <strong>
          {value.from} → {value.to}
        </strong>
        <span role="status" className={s.tag}>
          {stateLabel(value.state)}
        </span>
      </div>
      <p className={s.muted}>
        Current owner: {value.owner} · {value.scope} · Version {value.version}
      </p>
      <p>
        {value.state === 'denied'
          ? 'Handoff context is not accessible.'
          : value.context.slice(0, 10000)}
      </p>
      {value.error && (
        <p className={s.error} role="alert">
          {value.error}
        </p>
      )}
      <div className={a.footer} role="group" aria-label="Handoff decision">
        <Button
          variant="outline"
          disabled={value.state !== 'requested' || !value.version || !value.id}
          onClick={() => onDecision(value, 'decline')}
        >
          Decline handoff
        </Button>
        <Button
          disabled={value.state !== 'requested' || !value.version || !value.id}
          onClick={() => onDecision(value, 'accept')}
        >
          Accept handoff
        </Button>
      </div>
    </div>
  );
}
