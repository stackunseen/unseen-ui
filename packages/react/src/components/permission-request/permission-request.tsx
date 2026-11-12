'use client';
import type { ComponentProps, ReactElement } from 'react';
import { Button } from '../button/button.js';
import { Panel } from '../panel/panel.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import own from './permission-request.module.css';
import a from '../../shared/styles/action-layout.module.css';
import { permissionTone, ScopedPermissionRequest } from './scoped-permission-request.js';
import type { ScopedPermissionRequestProps } from './scoped-permission-request.js';

/** @deprecated Supply value, commandId and submission for exact scope and original receipts. */
export interface LegacyPermissionRequestProps
  extends VariantProps<'PermissionRequest'>, ComponentProps<'section'> {
  resource: string;
  scopes: string[];
  status: 'requested' | 'granted' | 'denied' | 'revoked';
  pending?: boolean;
  onDecision: (allow: boolean) => void;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}

export type PermissionRequestProps = LegacyPermissionRequestProps | ScopedPermissionRequestProps;

export function PermissionRequest(props: LegacyPermissionRequestProps): ReactElement;

export function PermissionRequest(props: ScopedPermissionRequestProps): ReactElement;

export function PermissionRequest(props: PermissionRequestProps) {
  return 'value' in props ? (
    <ScopedPermissionRequest {...props} />
  ) : (
    <LegacyPermissionRequest {...props} />
  );
}

function LegacyPermissionRequest({
  variant = 'card',
  resource,
  scopes,
  status,
  pending = false,
  onDecision,
  headingLevel = 3,
  className = '',
  ...rest
}: LegacyPermissionRequestProps) {
  const completeScope =
    !!resource.trim() && scopes.length > 0 && scopes.every((scope) => !!scope.trim());
  const Heading = `h${headingLevel}` as const;
  return (
    <Panel
      {...rest}
      data-part="permission-request"
      data-variant={variant}
      className={`${own.permission} ${className}`}
    >
      <div className={s.row + ' ' + own.row}>
        <Heading className={`${s.title + ' ' + own.title} ${s.grow}`}>
          {resource.trim() ? `Connect to ${resource}` : 'Connection access request'}
        </Heading>
        <span
          role="status"
          className={s.badge}
          data-tone={pending ? undefined : permissionTone[status]}
        >
          {pending ? 'Sending permission request…' : `Permission ${status}`}
        </span>
      </div>
      <p className={s.approvalSummary}>
        Requested access: {scopes.join(', ') || 'No scopes specified'}
      </p>
      {!completeScope && (
        <p className={s.warning} role="status">
          This request doesn’t say what it wants to access yet. You can allow access once it does.
        </p>
      )}
      <div
        className={`${s.actions + ' ' + own.actions} ${a.footer}`}
        role="group"
        aria-label="Permission decision"
      >
        <Button
          variant="outline"
          disabled={pending || status !== 'requested'}
          onClick={() => onDecision(false)}
        >
          Deny access
        </Button>
        <Button
          disabled={pending || status !== 'requested' || !completeScope}
          onClick={() => onDecision(true)}
        >
          Allow access
        </Button>
      </div>
      <p className={s.muted}>Access permission does not approve later actions.</p>
    </Panel>
  );
}
