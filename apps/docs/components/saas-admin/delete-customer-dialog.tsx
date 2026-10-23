import { AlertDialog, Button } from '@stackunseen/ui';
import type { RefObject } from 'react';
import type { SettingsSaveState } from './pattern-adapter';
import type { Customer } from './types';

export function DeleteCustomerDialog({
  customer,
  organization,
  state,
  onCancel,
  onConfirm,
  onReconcile,
  returnFocusRef,
  fallbackFocusRef,
}: {
  customer?: Customer;
  organization: string;
  state: SettingsSaveState;
  onCancel: () => void;
  onConfirm: () => void;
  onReconcile: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  fallbackFocusRef: RefObject<HTMLElement | null>;
}) {
  const blocked = state.status === 'pending' || state.status === 'unknown';
  return (
    <AlertDialog
      open={Boolean(customer)}
      busy={state.status === 'pending'}
      onOpenChange={(open) => {
        if (!open && !blocked) onCancel();
      }}
    >
      <AlertDialog.Content
        error={state.status === 'rejected' ? state.message : undefined}
        onCloseAutoFocus={(event) => {
          const target = returnFocusRef.current?.isConnected
            ? returnFocusRef.current
            : fallbackFocusRef.current;
          if (target?.isConnected) {
            event.preventDefault();
            target.focus({ preventScroll: true });
          }
        }}
      >
        <AlertDialog.Title>Delete {customer?.name} from the demo?</AlertDialog.Title>
        <AlertDialog.Description>
          This deletes saved version {customer?.version} from {organization}'s local customer
          records. No external customer record is deleted. Reloading the template restores its
          fixtures.
        </AlertDialog.Description>
        {(state.status === 'pending' || state.status === 'unknown') && (
          <p role="status">
            {state.status === 'pending'
              ? (state.message ?? 'Waiting for the local delete receipt...')
              : state.message}
          </p>
        )}
        <AlertDialog.Actions>
          <AlertDialog.Cancel disabled={blocked} onClick={onCancel}>
            Keep customer
          </AlertDialog.Cancel>
          {state.status === 'unknown' ? (
            <Button onClick={onReconcile}>Check if it went through</Button>
          ) : (
            <AlertDialog.Action disabled={blocked} onAction={onConfirm}>
              {state.status === 'pending' ? 'Deleting...' : 'Delete demo customer'}
            </AlertDialog.Action>
          )}
        </AlertDialog.Actions>
      </AlertDialog.Content>
    </AlertDialog>
  );
}
