'use client';
import type { WithRoot } from '../../shared/with-root.js';
import type { RunLifecycle } from '@stackunseen/ui-core';
import { Panel } from '../panel/panel.js';
import { Button } from '../button/button.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import { AIIcon } from '../../providers/icons/icons.js';
import { SummaryHeading } from '../../shared/summary-heading.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import own from './agent-card.module.css';

export function AgentCard({
  variant = 'card',
  name,
  description,
  state,
  activity,
  selected = false,
  onSelect,
  className = '',
  ...rest
}: WithRoot<
  VariantProps<'AgentCard'> & {
    name: string;
    description: string;
    state: RunLifecycle | 'idle';
    activity?: string;
    selected?: boolean;
    onSelect?: () => void;
  } & { className?: string },
  'section'
>) {
  return (
    <Panel
      {...rest}
      className={`${own.agentCard} ${className}`}
      data-variant={variant}
      data-selected={selected}
    >
      <div className={s.row + ' ' + own.row}>
        <SummaryHeading
          icon={
            <span className={own.agentIcon} aria-hidden="true">
              <AIIcon name="assistant" />
            </span>
          }
        >
          {name}
        </SummaryHeading>
        <StatusBadge state={state} />
      </div>
      <div className={own.agentDetails}>
        <p className={s.muted}>{description}</p>
        {activity && <p>{activity}</p>}
      </div>
      {onSelect && (
        <div className={`${s.actions} ${s.trailingActions + ' ' + own.trailingActions}`}>
          <Button size="sm" variant="outline" aria-pressed={selected} onClick={onSelect}>
            Inspect agent
          </Button>
        </div>
      )}
    </Panel>
  );
}
