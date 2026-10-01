'use client';
import type { RunLifecycle } from '@ai-interaction/core';
import { Panel } from '../panel/panel.js';
import { Button } from '../button/button.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import { AIIcon } from '../../providers/icons/icons.js';
import { SummaryHeading } from '../../shared/summary-heading.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';

export function AgentCard({
  variant = 'card',
  name,
  description,
  state,
  activity,
  selected = false,
  onSelect,
}: VariantProps<'AgentCard'> & {
  name: string;
  description: string;
  state: RunLifecycle | 'idle';
  activity?: string;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <Panel className={s.agentCard} data-variant={variant} data-selected={selected}>
      <div className={s.row}>
        <SummaryHeading
          icon={
            <span className={s.agentIcon} aria-hidden="true">
              <AIIcon name="assistant" />
            </span>
          }
        >
          {name}
        </SummaryHeading>
        <StatusBadge state={state} />
      </div>
      <div className={s.agentDetails}>
        <p className={s.muted}>{description}</p>
        {activity && <p>{activity}</p>}
      </div>
      {onSelect && (
        <div className={`${s.actions} ${s.trailingActions}`}>
          <Button size="sm" variant="outline" aria-pressed={selected} onClick={onSelect}>
            Inspect agent
          </Button>
        </div>
      )}
    </Panel>
  );
}
