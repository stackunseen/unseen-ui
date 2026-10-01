'use client';
import { Button } from '../button/button.js';
import { Panel } from '../panel/panel.js';
import { AIIcon } from '../../providers/icons/icons.js';
import { SummaryHeading } from '../../shared/summary-heading.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';

export function MCPServerCard({
  variant = 'card',
  name,
  status,
  toolCount,
  onConnect,
  onDisconnect,
  pending = false,
}: VariantProps<'MCPServerCard'> & {
  name: string;
  status: 'connected' | 'disconnected' | 'auth-required' | 'unknown';
  toolCount?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  pending?: boolean;
}) {
  return (
    <Panel className={s.serverCard} data-variant={variant}>
      <div className={s.row}>
        <SummaryHeading
          icon={
            <span className={s.sourceIcon} aria-hidden="true">
              <AIIcon name="tool" />
            </span>
          }
        >
          {name}
        </SummaryHeading>
        <span className={s.muted}>{status}</span>
      </div>
      <p className={s.muted}>
        {typeof toolCount === 'number' && Number.isSafeInteger(toolCount) && toolCount >= 0
          ? `${toolCount} tools reported by host`
          : 'Tool availability unknown'}
      </p>
      {((status !== 'connected' && onConnect) || (status === 'connected' && onDisconnect)) && (
        <div className={`${s.actions} ${s.trailingActions}`}>
          {status !== 'connected' && onConnect && (
            <Button size="sm" variant="outline" disabled={pending} onClick={onConnect}>
              {pending
                ? 'Connecting…'
                : status === 'auth-required'
                  ? 'Authorize connection'
                  : 'Connect'}
            </Button>
          )}
          {status === 'connected' && onDisconnect && (
            <Button size="sm" variant="ghost" disabled={pending} onClick={onDisconnect}>
              Disconnect
            </Button>
          )}
        </div>
      )}
    </Panel>
  );
}
