import type { EditingCommandState } from '@stackunseen/ui-core/editing';
import { Button } from '../button/button.js';
import { Accordion } from '../accordion/accordion.js';
import { identity } from './model.js';
import type { ArtifactReceiptLookup } from './types.js';
import s from './artifact-editor.module.css';

export function ArtifactReceiptStatus({
  kind,
  state,
  onLookupReceipt,
  lookupPending,
}: {
  kind: 'save' | 'export';
  state: EditingCommandState;
  onLookupReceipt?: (command: ArtifactReceiptLookup) => void;
  lookupPending: boolean;
}) {
  if (state.status === 'idle') return null;
  const command = state.status === 'settled' ? state.receipt : state;
  const message =
    state.status === 'settled'
      ? state.receipt.result === 'applied'
        ? `${kind === 'save' ? 'Save' : 'Export'} acknowledged for revision ${state.receipt.target.version}.`
        : `${kind === 'save' ? 'Save' : 'Export'} rejected: ${state.receipt.reason.slice(0, 1000)}`
      : state.status === 'pending'
        ? `${kind === 'save' ? 'Save' : 'Export'} awaiting host acknowledgement.`
        : `${kind === 'save' ? 'Save' : 'Export'} outcome unknown. Check the original receipt before trying again.`;
  return (
    <div data-part={`artifact-${kind}-receipt`}>
      <p
        role={
          state.status === 'settled' && state.receipt.result === 'rejected' ? 'alert' : 'status'
        }
      >
        {message}
      </p>
      <Accordion
        type="single"
        collapsible
        region={false}
        items={[
          {
            value: `${kind}-command`,
            title: `${kind === 'save' ? 'Save' : 'Export'} command details`,
            content: (
              <p className={s.metadata}>
                {command.commandId} · {command.target.documentId} · {command.target.version}
              </p>
            ),
          },
        ]}
      />
      {state.status === 'unknown' &&
        (onLookupReceipt ? (
          <Button
            variant="outline"
            disabled={lookupPending}
            onClick={() =>
              onLookupReceipt(
                Object.freeze({
                  kind,
                  commandId: state.commandId,
                  target: identity(state.target),
                }),
              )
            }
          >
            Check {kind} receipt
          </Button>
        ) : (
          <p className={s.metadata}>
            The host must resolve this original command before another attempt.
          </p>
        ))}
    </div>
  );
}
