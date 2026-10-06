'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AttachmentPicker, Button, IconButton, Select } from '@stackunseen/ui';
import { UploadAttachment } from '@stackunseen/ui/upload';
import { createUploadClient } from './upload-host/client';
import type { UploadClientSnapshot } from './upload-host/client';
import s from './upload-example.module.css';
const initial: UploadClientSnapshot = Object.freeze({
  connected: false,
  busy: false,
  stale: true,
  paused: false,
  detail: 'Connect to the local upload host to select a file.',
});
const noSubscribe = () => () => {};
const noSnapshot = () => initial;

export function UploadExample() {
  const [client, setClient] = useState<ReturnType<typeof createUploadClient>>();
  const state = useSyncExternalStore(
    client?.subscribe ?? noSubscribe,
    client?.getSnapshot ?? noSnapshot,
    noSnapshot,
  );
  const [variant, setVariant] = useState<'row' | 'tile' | 'compact'>('row');
  const region = useRef<HTMLElement>(null);
  const focused = useRef<HTMLElement | undefined>(undefined);
  useEffect(() => {
    const owner = createUploadClient();
    setClient(owner);
    return () => owner.dispose();
  }, []);
  useEffect(() => {
    const target = focused.current;
    if (
      target &&
      (!target.isConnected || (target instanceof HTMLButtonElement && target.disabled)) &&
      (document.activeElement === target || document.activeElement === document.body)
    )
      region.current?.focus();
  });
  const blocked = !client || state.busy || !!state.operation;
  return (
    <section
      className={s.example}
      aria-label="Local upload example"
      tabIndex={-1}
      ref={region}
      onFocusCapture={(event) => {
        focused.current = event.target;
      }}
      onBlurCapture={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          focused.current = undefined;
      }}
    >
      <div className={s.header}>
        <div className={s.heading}>
          <h3>Attachments with a confirmed checkpoint</h3>
          <p>A bounded local disk host. Transfer activity and host decisions stay separate.</p>
        </div>
        <label className={s.setting}>
          Attachment layout
          <Select
            aria-label="Upload attachment layout"
            value={variant}
            onValueChange={(v) => setVariant(v as typeof variant)}
            options={[
              { value: 'row', label: 'Row' },
              { value: 'tile', label: 'Tile' },
              { value: 'compact', label: 'Compact' },
            ]}
          />
        </label>
      </div>
      <div className={s.panel}>
        <div className={s.toolbar}>
          {!state.connected && (
            <Button size="sm" disabled={blocked} onClick={() => void client?.connect()}>
              Connect local host
            </Button>
          )}
          <div className={s.rail} role="group" aria-label="Upload example controls">
            <IconButton
              icon="retry"
              label="Reconnect upload host"
              disabled={blocked}
              onClick={() => void client?.connect()}
            />
            {state.busy && state.operation && (
              <IconButton
                icon="stop"
                label="Pause after current upload checkpoint"
                disabled={!state.busy || !state.operation}
                onClick={() => client?.pause()}
              />
            )}
            {state.operation?.state === 'submitting' && (
              <IconButton
                icon="close"
                label="Interrupt current upload response"
                disabled={!state.busy || state.operation?.state !== 'submitting'}
                onClick={() => client?.interrupt()}
              />
            )}
            <IconButton
              icon="warning"
              label="Lose next upload response after commit"
              disabled={!state.connected || blocked}
              onClick={() => void client?.loseNextResponse()}
            />
            {state.value && state.value.state !== 'selected' && state.value.state !== 'removed' && (
              <IconButton
                icon="info"
                label={
                  state.value.access === 'available'
                    ? 'Revoke upload access'
                    : 'Restore upload access'
                }
                disabled={blocked || state.stale}
                onClick={() => void client?.setAccess(state.value?.access !== 'available')}
              />
            )}
            {state.value?.state === 'ready' && (
              <IconButton
                icon="document"
                label="Load safe text preview"
                disabled={blocked || state.stale || state.value.access !== 'available'}
                onClick={() => void client?.preview()}
              />
            )}
          </div>
        </div>
        <AttachmentPicker
          label="Choose file for local upload"
          disabled={!state.connected || blocked}
          maxFileBytes={4 * 1024 * 1024}
          remainingSlots={1}
          onFilesSelected={(files) => {
            if (files[0]) void client?.select(files[0]);
          }}
        />
        {state.value && (
          <div className={s.attachment} data-layout={variant}>
            <UploadAttachment
              variant={variant}
              detailsHeadingLevel={4}
              value={state.value}
              reference={state.value.context}
              operation={state.operation}
              stale={state.stale}
              loading={state.busy && !state.operation}
              preview={
                state.preview === undefined ? undefined : { kind: 'text', text: state.preview }
              }
              onRequest={(request) => {
                if (request.action === 'refresh') void client?.refresh();
                else if (request.action === 'upload' || request.action === 'resume')
                  void client?.transfer();
                else void client?.mutate(request.action);
              }}
              onLookup={(original) => void client?.lookup(original)}
            />
          </div>
        )}
        <p className={s.status} role="status">
          {state.detail}
        </p>
        {state.paused && (
          <p className={s.muted}>
            Paused locally. Resume continues only from the host’s committed offset.
          </p>
        )}
        {state.previewTruncated && (
          <p className={s.muted}>
            Preview is limited to 20,000 characters. Original bytes stay in the host.
          </p>
        )}
        {state.lastReceipt && (
          <p className={s.muted} data-part="upload-receipt">
            Original {state.lastReceipt.command.operation} receipt: {state.lastReceipt.outcome} ·
            submitted at revision {state.lastReceipt.command.expectedRevision}.
          </p>
        )}
      </div>
      <p className={s.muted}>
        Run <code>pnpm uploads:serve</code> after the build and use{' '}
        <a href="http://127.0.0.1:4179/">the local upload consumer</a>. The host stores up to eight
        files, 4 MiB each. This browser keeps the selected bytes and unresolved original in memory;
        keep this page open while reconciling a response. No provider or production authentication
        is connected.
      </p>
    </section>
  );
}
