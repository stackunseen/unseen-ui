'use client';
import type { ComponentProps } from 'react';
import { AIIcon } from '../../providers/icons/icons.js';
import type { IconName } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
const states: Record<string, { label: string; symbol: IconName; tone: string }> = {
  idle: { label: 'Idle', symbol: 'idle', tone: 'neutral' },
  queued: { label: 'Queued', symbol: 'pending', tone: 'neutral' },
  running: { label: 'Running', symbol: 'running', tone: 'primary' },
  'input-streaming': { label: 'Receiving input', symbol: 'running', tone: 'primary' },
  succeeded: { label: 'Complete', symbol: 'check', tone: 'success' },
  approved: { label: 'Approved', symbol: 'check', tone: 'success' },
  failed: { label: 'Failed', symbol: 'warning', tone: 'danger' },
  denied: { label: 'Denied', symbol: 'close', tone: 'danger' },
  rejected: { label: 'Rejected', symbol: 'close', tone: 'neutral' },
  cancelled: { label: 'Cancelled', symbol: 'stop', tone: 'neutral' },
  'waiting-input': { label: 'Needs input', symbol: 'unknown', tone: 'warning' },
  'waiting-approval': { label: 'Needs review', symbol: 'warning', tone: 'warning' },
  'approval-required': { label: 'Needs review', symbol: 'warning', tone: 'warning' },
  pending: { label: 'Pending', symbol: 'pending', tone: 'warning' },
  paused: { label: 'Paused', symbol: 'paused', tone: 'neutral' },
  blocked: { label: 'Blocked', symbol: 'warning', tone: 'warning' },
  expired: { label: 'Expired', symbol: 'pending', tone: 'warning' },
  superseded: { label: 'Changed', symbol: 'retry', tone: 'warning' },
  'outcome-unknown': { label: 'Outcome unknown', symbol: 'unknown', tone: 'warning' },
  unknown: { label: 'Unknown', symbol: 'unknown', tone: 'neutral' },
};
export interface StatusBadgeProps extends ComponentProps<'span'>, VariantProps<'StatusBadge'> {
  state: string;
  label?: string;
}
export function StatusBadge({
  state,
  label,
  variant = 'soft',
  className = '',
  ...props
}: StatusBadgeProps) {
  const data = states[state] ?? states.unknown!;
  return (
    <span
      {...props}
      className={`${s.badge} ${className}`}
      data-variant={variant}
      data-tone={data.tone}
      data-part="status"
    >
      <AIIcon name={data.symbol} size={12} />
      <span>{label ?? data.label}</span>
    </span>
  );
}
