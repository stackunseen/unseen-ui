'use client';
import type { ReactElement } from 'react';
import { Button } from '../button/button.js';
import { Panel } from '../panel/panel.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import a from '../../shared/styles/action-layout.module.css';
import { permissionTone, ScopedPermissionRequest } from './scoped-permission-request.js';
import type { ScopedPermissionRequestProps } from './scoped-permission-request.js';

/** @deprecated Supply value, commandId and submission for exact scope and original receipts. */
export interface LegacyPermissionRequestProps extends VariantProps<'PermissionRequest'> {
  resource: string;
  scopes: string[];
  status: 'requested' | 'granted' | 'denied' | 'revoked';
  pending?: boolean;
  onDecision: (allow: boolean) => void;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
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
}: LegacyPermissionRequestProps) {
  const completeScope =
    !!resource.trim() && scopes.length > 0 && scopes.every((scope) => !!scope.trim());
  const Heading = `h${headingLevel}` as const;
  return (
    <Panel data-part="permission-request" data-variant={variant} className={s.permission}>
      <div className={s.row}>
        <Heading className={`${s.title} ${s.grow}`}>
          {resource.trim() ? `Connect to ${resource}` : 'Connection access request'}
        </Heading>
        <span
          role="status"
          className={s.badge}
          data-tone={pending ? undefined : permissionTone[status]}
        >
          {pending ? 'Sending permission request…' : `Permission: ${status}`}
        </span>
      </div>
      <dl className={s.definition}>
        <dt>Requested access</dt>
        <dd>{scopes.join(', ') || 'No scopes specified'}</dd>
      </dl>
      {!completeScope && (
        <p className={s.warning} role="status">
          The host must provide the resource and requested scopes before you can allow access.
        </p>
      )}
      <div className={`${s.actions} ${a.footer}`} role="group" aria-label="Permission decision">
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
