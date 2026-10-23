'use client';
import { useLayoutEffect, useRef } from 'react';
import {
  inspectUploadCheckpoint,
  inspectUploadContext,
  inspectUploadOperation,
  sameUploadContext,
  uploadContextKey,
} from '@stackunseen/ui-core/uploads';
import type {
  UploadActionRequest,
  UploadCheckpoint,
  UploadCommand,
  UploadContext,
  UploadOperation,
  UploadOpenRequest,
} from '@stackunseen/ui-core/uploads';
import { Attachment } from '../attachment/attachment.js';
import type { AttachmentPreviewSource } from '../attachment/attachment.js';
import { IconButton } from '../icon-button/icon-button.js';
import { Accordion } from '../accordion/accordion.js';
import type { VariantProps } from '../../shared/variants.js';
import u from './upload-attachment.module.css';

export interface UploadAttachmentProps extends VariantProps<'Attachment'> {
  value: UploadCheckpoint;
  reference: UploadContext;
  operation?: UploadOperation;
  stale?: boolean;
  loading?: boolean;
  /** Match the surrounding document hierarchy for the provenance disclosure. */
  detailsHeadingLevel?: 2 | 3 | 4 | 5 | 6;
  preview?: AttachmentPreviewSource;
  onRequest?: (request: UploadActionRequest) => void;
  onLookup?: (original: UploadCommand) => void;
  /** The host authorizes and opens this exact immutable resource. */
  onOpen?: (request: UploadOpenRequest) => void;
}

/** Presentation and intent only. Lifecycle, committed bytes and receipts belong to the host. */
export function UploadAttachment({
  value,
  reference,
  operation,
  variant = 'row',
  stale = false,
  loading = false,
  detailsHeadingLevel = 3,
  preview,
  onRequest,
  onLookup,
  onOpen,
}: UploadAttachmentProps) {
  const checkpoint = inspectUploadCheckpoint(value);
  const context = inspectUploadContext(reference);
  const observedOperation = operation === undefined ? undefined : inspectUploadOperation(operation);
  const invalidOperation = operation !== undefined && !observedOperation;
  const matched = !!checkpoint && !!context && sameUploadContext(checkpoint.context, context);
  const operationMatched =
    !observedOperation ||
    (!!context && sameUploadContext(observedOperation.command.context, context));
  const valid = matched && !invalidOperation && operationMatched;
  const wrapper = useRef<HTMLDivElement>(null);
  const focused = useRef<HTMLElement | undefined>(undefined);
  useLayoutEffect(() => {
    const target = focused.current;
    if (
      target &&
      (!target.isConnected || (target instanceof HTMLButtonElement && target.disabled)) &&
      (document.activeElement === document.body || document.activeElement === target)
    ) {
      wrapper.current?.focus();
      focused.current = wrapper.current ?? undefined;
    }
  });
  const busy = observedOperation?.state === 'submitting';
  const unresolved =
    busy ||
    observedOperation?.state === 'acknowledged' ||
    observedOperation?.state === 'outcome-unknown';
  const editable = valid && !stale && !loading && checkpoint?.access === 'available' && !unresolved;
  const resumeRelevant = checkpoint?.state === 'uploading' || checkpoint?.state === 'failed';
  const hasActions =
    !!onRequest || !!onOpen || (observedOperation?.state === 'outcome-unknown' && !!onLookup);
  function request(action: UploadActionRequest['action']) {
    if (!valid || !checkpoint || !context || !onRequest) return;
    onRequest({ context, expectedRevision: checkpoint.revision, action });
  }
  return (
    <div
      className={u.wrapper}
      ref={wrapper}
      tabIndex={-1}
      role="group"
      aria-label={
        valid && checkpoint ? `Upload ${checkpoint.name}` : 'Upload attachment unavailable'
      }
      data-part="upload-attachment"
      data-variant={variant}
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
      {!valid || !checkpoint || !context ? (
        <div className={u.status}>
          <p role="alert">
            {invalidOperation
              ? 'Invalid or excessive upload operation.'
              : !operationMatched
                ? 'Upload operation belongs to another resource. No action can be requested here.'
                : 'Upload checkpoint is invalid or does not match the requested resource.'}
          </p>
        </div>
      ) : (
        <Attachment.Root
          key={uploadContextKey(context)}
          className={u.root}
          variant={variant}
          name={checkpoint.name}
          state={checkpoint.state}
          access={checkpoint.access}
          detail={checkpoint.detail}
          mediaType={checkpoint.mediaType}
          sizeBytes={checkpoint.sizeBytes}
          reference={{ attachmentId: context.attachmentId, version: context.version }}
          resource={{
            attachmentId: checkpoint.context.attachmentId,
            version: checkpoint.context.version,
          }}
          preview={!stale && !loading ? preview : undefined}
          progress={
            !stale && !loading
              ? { loaded: checkpoint.receivedBytes, total: checkpoint.sizeBytes }
              : undefined
          }
        >
          <Attachment.Preview />
          <Attachment.Info />
          {hasActions && (
            <div
              className={u.actions}
              role="group"
              aria-label={`Upload actions for ${checkpoint.name}`}
            >
              {onOpen && (
                <IconButton
                  icon="external"
                  label={`Open original ${checkpoint.name}`}
                  disabled={
                    stale ||
                    loading ||
                    checkpoint.access !== 'available' ||
                    checkpoint.state !== 'ready'
                  }
                  onClick={() => onOpen({ context, expectedRevision: checkpoint.revision })}
                />
              )}
              {onRequest && (
                <>
                  <IconButton
                    icon="retry"
                    label={`Refresh upload status for ${checkpoint.name}`}
                    disabled={loading || busy}
                    onClick={() => request('refresh')}
                  />
                  {checkpoint.state === 'selected' && (
                    <IconButton
                      icon="send"
                      variant="primary"
                      label={`Upload ${checkpoint.name}`}
                      disabled={!editable}
                      onClick={() => request('upload')}
                    />
                  )}
                  {resumeRelevant && (
                    <IconButton
                      icon="running"
                      label={`Resume upload for ${checkpoint.name}`}
                      disabled={!editable || checkpoint.capabilities.resume !== 'supported'}
                      onClick={() => request('resume')}
                    />
                  )}
                  {checkpoint.state === 'uploading' && checkpoint.capabilities.cancel && (
                    <IconButton
                      icon="stop"
                      label={`Cancel upload for ${checkpoint.name}`}
                      disabled={!editable}
                      onClick={() => request('cancel')}
                    />
                  )}
                  {checkpoint.state !== 'removed' && checkpoint.capabilities.remove && (
                    <IconButton
                      icon="close"
                      label={`Remove ${checkpoint.name}`}
                      disabled={!editable}
                      onClick={() => request('remove')}
                    />
                  )}
                </>
              )}
              {observedOperation?.state === 'outcome-unknown' && onLookup && (
                <IconButton
                  icon="search"
                  label={`Check whether ${checkpoint.name} finished uploading`}
                  disabled={loading}
                  onClick={() => onLookup(observedOperation.command)}
                />
              )}
            </div>
          )}
          {checkpoint.state === 'uploading' && checkpoint.sizeBytes > 0 && !stale && !loading && (
            <Attachment.Progress />
          )}
          <div className={u.status}>
            <p>{`${stale ? 'Historical h' : 'H'}ost-confirmed received bytes: ${checkpoint.receivedBytes.toLocaleString('en-US')} of ${checkpoint.sizeBytes.toLocaleString('en-US')}.`}</p>
            {checkpoint.state === 'uploading' && checkpoint.sizeBytes === 0 && (
              <p>Empty file. Waiting for final confirmation.</p>
            )}
            {loading && <p role="status">Checking the upload…</p>}
            {stale && (
              <p role="status" data-unknown="true">
                This upload status is out of date. Refresh before making changes.
              </p>
            )}
            {resumeRelevant && (
              <p>{`Resume ${checkpoint.capabilities.resume === 'supported' ? 'supported' : checkpoint.capabilities.resume === 'unsupported' ? 'unsupported' : 'support unknown'}.`}</p>
            )}
            {observedOperation && (
              <p role="status" data-unknown={observedOperation.state === 'outcome-unknown'}>
                {observedOperation.state === 'submitting'
                  ? 'Waiting to confirm the earlier upload.'
                  : observedOperation.state === 'acknowledged'
                    ? 'Original upload request received. Checkpoint lifecycle is reported separately.'
                    : observedOperation.state === 'outcome-unknown'
                      ? 'It’s not clear whether the earlier upload finished. Check before uploading again.'
                      : observedOperation.state === 'failed'
                        ? 'Original upload request rejected. Checkpoint lifecycle is unchanged.'
                        : 'Original upload request has not been submitted.'}
              </p>
            )}
            {observedOperation?.detail && <p>{observedOperation.detail}</p>}
            {observedOperation?.state === 'outcome-unknown' && !onLookup && (
              <p>
                You can’t check the earlier upload from here, so it needs to be checked before
                trying again.
              </p>
            )}
            <Accordion
              type="single"
              collapsible
              variant="divided"
              region={false}
              headingLevel={detailsHeadingLevel}
              items={[
                {
                  value: 'provenance',
                  title: `Upload details for ${checkpoint.name}`,
                  content: (
                    <>
                      <p>{`Capability source: ${checkpoint.capabilities.source} · version ${checkpoint.capabilities.version}.`}</p>
                      <p>{`Current revision: ${checkpoint.revision}. Immutable content digest: ${checkpoint.sha256}.`}</p>
                    </>
                  ),
                },
              ]}
            />
          </div>
        </Attachment.Root>
      )}
    </div>
  );
}
