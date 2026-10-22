'use client';
import { useId } from 'react';
import type { CommandReceipt, Measurement } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { ChipGroup } from '../chip/chip.js';
import { Tag } from '../tag/tag.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import type { VariantProps } from '../../shared/variants.js';
import { MeasuredText, formatTime } from '../runs/shared.js';
import s from '../../shared/styles/styles.module.css';
import g from './governance.module.css';

export type ScopeGrantStatus = 'active' | 'expired' | 'revoked' | 'revoking' | 'unknown';
export interface ScopeGrant {
  id: string;
  version: number;
  /** What the grant covers, in the host's own scope names. */
  scopes: readonly string[];
  target: string;
  grantedAt: string;
  grantedBy?: string;
  expiresAt?: string;
  uses?: Measurement<number>;
  maxUses?: number;
  status: ScopeGrantStatus;
  /** The approval this grant came from, when the host remembers it. */
  sourceProposalId?: string;
}
export interface ScopeGrantRevokeRequest {
  grantId: string;
  version: number;
}
export interface ScopeGrantListProps extends VariantProps<'ScopeGrant'> {
  grants: readonly ScopeGrant[];
  onRevoke?: (request: ScopeGrantRevokeRequest) => void;
  /** Receipts keyed by grant id; a submitting receipt shows the grant as revoking. */
  receipts?: readonly CommandReceipt[];
  /** The host clock, so expiry is derived deterministically. */
  now?: string;
  locale?: string;
  timeZone?: string;
  label?: string;
  emptyMessage?: string;
}

function remaining(expiresAt: string | undefined, now: string | undefined) {
  if (!expiresAt) return undefined;
  const end = Date.parse(expiresAt);
  const current = now ? Date.parse(now) : NaN;
  if (!Number.isFinite(end) || !Number.isFinite(current)) return undefined;
  const ms = end - current;
  if (ms <= 0) return 'Expired';
  if (ms < 60_000) return 'Expires in under a minute';
  if (ms < 3_600_000) return `Expires in ${Math.round(ms / 60_000)} min`;
  if (ms < 86_400_000) return `Expires in ${Math.round(ms / 3_600_000)} h`;
  return `Expires in ${Math.round(ms / 86_400_000)} days`;
}

/** Standing permissions with their scope, expiry, use count and a host-acknowledged revoke. */
export function ScopeGrantList({
  variant = 'list',
  grants,
  onRevoke,
  receipts = [],
  now,
  locale,
  timeZone,
  label = 'Standing permissions',
  emptyMessage = 'No standing permissions.',
}: ScopeGrantListProps) {
  const id = useId();
  const pending = new Set(
    receipts
      .filter((receipt) => receipt.status === 'submitting')
      .map((receipt) => receipt.commandId),
  );
  return (
    <section
      className={g.root}
      data-part="scope-grants"
      data-variant={variant}
      aria-labelledby={`${id}-title`}
    >
      <h3 id={`${id}-title`} className={g.title}>
        {label}
      </h3>
      {grants.length === 0 ? (
        <p className={s.muted} role="status">
          {emptyMessage}
        </p>
      ) : (
        <ul className={g.list}>
          {grants.map((grant) => {
            const revoking = grant.status === 'revoking' || pending.has(grant.id);
            const expiryText = remaining(grant.expiresAt, now);
            const status = revoking
              ? 'revoking'
              : expiryText === 'Expired' && grant.status === 'active'
                ? 'expired'
                : grant.status;
            const live = status === 'active';
            return (
              <li key={`${grant.id}:${grant.version}`} className={g.grant} data-status={status}>
                <div className={g.grantHead}>
                  <strong className={g.grantTarget}>{grant.target}</strong>
                  <StatusBadge
                    state={
                      status === 'active'
                        ? 'succeeded'
                        : status === 'revoking'
                          ? 'running'
                          : status === 'unknown'
                            ? 'unknown'
                            : status === 'expired'
                              ? 'expired'
                              : 'cancelled'
                    }
                    label={
                      status === 'active'
                        ? 'Active'
                        : status === 'revoking'
                          ? 'Revoking'
                          : status === 'expired'
                            ? 'Expired'
                            : status === 'revoked'
                              ? 'Revoked'
                              : 'Unknown'
                    }
                  />
                </div>
                <ChipGroup label={`Scopes for ${grant.target}`}>
                  {grant.scopes.map((scope) => (
                    <Tag key={scope} size="sm">
                      {scope}
                    </Tag>
                  ))}
                </ChipGroup>
                {variant !== 'compact' && (
                  <div className={g.meta}>
                    <span>
                      Granted {formatTime(grant.grantedAt, locale, timeZone)}
                      {grant.grantedBy ? ` by ${grant.grantedBy}` : ''}
                    </span>
                    {/* The badge already says Expired; the line keeps only the time left. */}
                    {expiryText && status !== 'expired' && <span>{expiryText}</span>}
                    {!grant.expiresAt && <span>No expiry</span>}
                    {grant.uses &&
                      (grant.uses.kind === 'unknown' ? (
                        // "Uses not counted (reason)" reads better than an unknown number mid-sentence.
                        <MeasuredText
                          measurement={grant.uses}
                          format={String}
                          unknownLabel="Uses not counted"
                        />
                      ) : (
                        <span>
                          Used{' '}
                          <MeasuredText
                            measurement={grant.uses}
                            format={(value) => String(value)}
                          />
                          {grant.maxUses !== undefined ? ` of ${grant.maxUses}` : ''} times
                        </span>
                      ))}
                    {grant.sourceProposalId && <span>From approval {grant.sourceProposalId}</span>}
                  </div>
                )}
                {onRevoke && live && (
                  <div className={g.actions}>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Revoke access to ${grant.target}`}
                      onClick={() => onRevoke({ grantId: grant.id, version: grant.version })}
                    >
                      Revoke
                    </Button>
                  </div>
                )}
                {revoking && (
                  <p className={s.muted} role="status">
                    Revoke requested. Waiting for the host to confirm.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
