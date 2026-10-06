'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Attachment,
  AttachmentGroup,
  AttachmentPicker,
  PromptInput,
  resolveVariant,
} from '@stackunseen/ui';
import type { AttachmentProps, ComponentVariant } from '@stackunseen/ui';
import { UploadAttachment } from '@stackunseen/ui/upload';
import type { UploadCheckpoint, UploadOperation } from '@stackunseen/ui-core/uploads';

const image = {
  kind: 'image' as const,
  src: '/fixtures/attachment-report.svg',
  alt: 'Synthetic owner-review report with three blue bars for reviewed, assigned and pending.',
};
export function AttachmentSpecimen({
  state,
  presentation,
  onNotice,
}: {
  state: string;
  presentation?: string;
  onNotice: (text: string) => void;
}) {
  if (
    [
      'Upload checkpoint',
      'Lost upload receipt',
      'Resume unsupported',
      'Resume unknown',
      'Stale upload',
      'Upload revoked',
    ].includes(state)
  ) {
    const value: UploadCheckpoint = {
      context: {
        workspaceId: 'gallery',
        threadId: 'review',
        attachmentId: 'notes',
        version: 'content-1',
        uploadId: 'upload-1',
      },
      revision: 2,
      state: 'uploading',
      access: state === 'Upload revoked' ? 'revoked' : 'available',
      name: 'Account review.csv',
      mediaType: 'text/csv',
      sizeBytes: 24576,
      receivedBytes: 8192,
      sha256: 'a'.repeat(64),
      capabilities: {
        resume:
          state === 'Resume unsupported'
            ? 'unsupported'
            : state === 'Resume unknown'
              ? 'unknown'
              : 'supported',
        cancel: true,
        remove: true,
        maxFileBytes: 32768,
        maxChunkBytes: 16384,
        source: 'gallery-fixture',
        version: '1',
      },
    };
    const operation: UploadOperation | undefined =
      state === 'Lost upload receipt'
        ? {
            command: {
              commandId: 'original-append',
              context: value.context,
              expectedRevision: 1,
              operation: 'append',
              offset: 0,
              byteLength: 8192,
              sha256: 'b'.repeat(64),
            },
            state: 'outcome-unknown',
            detail:
              'Simulated lost acknowledgement. Refresh does not prove this original operation.',
          }
        : undefined;
    return (
      <UploadAttachment
        value={value}
        reference={value.context}
        operation={operation}
        stale={state === 'Stale upload'}
        variant={resolveVariant('Attachment', presentation)}
        onRequest={(request) =>
          onNotice(
            `${request.action} requested at revision ${request.expectedRevision}. Fixture does not execute it.`,
          )
        }
        onLookup={(original) =>
          onNotice(`Read-only lookup requested for ${original.commandId}. Nothing was resent.`)
        }
      />
    );
  }
  const props: AttachmentProps = {
    variant: resolveVariant('Attachment', presentation),
    name: 'Account review.csv',
    state: 'ready',
    sizeBytes: 24576,
    mediaType: 'text/csv',
    onRemove: () => onNotice('Removal requested. The host must confirm.'),
    onRetry: () => onNotice('Upload retry requested. The host must confirm.'),
  };
  if (['Uploading', 'Unknown progress', 'Awaiting confirmation'].includes(state)) {
    props.state = 'uploading';
    props.progress =
      state === 'Unknown progress'
        ? undefined
        : { loaded: state === 'Awaiting confirmation' ? 24576 : 8192, total: 24576 };
  }
  if (state === 'Selected') {
    props.state = 'selected';
    props.detail = 'Selected locally. No upload has started.';
  }
  if (state === 'Removing') props.state = 'removing';
  if (state === 'Cancelled') {
    props.state = 'cancelled';
    props.detail = 'Host confirmed cancellation; stored bytes cleared.';
  }
  if (state === 'Removed') {
    props.state = 'removed';
    props.access = 'missing';
    props.detail = 'Host confirmed removal; original receipts remain available.';
  }
  if (state === 'Unknown outcome') props.state = 'outcome-unknown';
  if (state === 'Failed' || state === 'Long filename') {
    props.state = 'failed';
    props.detail = 'Upload interrupted. Retry when the connection is restored.';
    if (state === 'Long filename')
      props.name =
        'Customer-account-reconciliation_2026-09-29_Europe-production-workspace_owner-review-and-supporting-evidence.csv';
  }
  if (['Image', 'Revoked', 'Expired', 'Missing', 'Broken preview', 'Blocked URL'].includes(state)) {
    props.name = 'Owner review.svg';
    props.mediaType = 'image/svg+xml';
    props.sizeBytes = undefined;
    props.preview =
      state === 'Broken preview'
        ? { ...image, src: '/fixtures/absent-image.svg' }
        : state === 'Blocked URL'
          ? { ...image, src: 'javascript:alert(1)' }
          : image;
    props.onOpen = () =>
      onNotice('Host open requested. This fixture does not open an external file.');
    if (state === 'Revoked') props.access = 'revoked';
    if (state === 'Expired') props.access = 'expired';
    if (state === 'Missing') props.access = 'missing';
  }
  if (state === 'Text') {
    props.name = 'Review notes.txt';
    props.mediaType = 'text/plain';
    props.preview = {
      kind: 'text',
      text: 'Account review\n\nThree synthetic accounts require an owner review.\nNo external action has been taken.\n\n<This is inert text, not HTML.>',
    };
  }
  if (state === 'Audio') {
    props.name = 'Synthetic tone.wav';
    props.mediaType = 'audio/wav';
    props.sizeBytes = undefined;
    props.preview = {
      kind: 'audio',
      src: '/fixtures/attachment-tone.wav',
      transcript: '[A short, quiet synthetic tone. No speech.]',
    };
  }
  if (state === 'Video') {
    props.name = 'Synthetic test pattern.mp4';
    props.mediaType = 'video/mp4';
    props.sizeBytes = undefined;
    props.preview = {
      kind: 'video',
      src: '/fixtures/attachment-pattern.mp4',
      captions: {
        src: '/fixtures/attachment-captions.vtt',
        language: 'en',
        label: 'English description',
      },
    };
  }
  if (state === 'Collection')
    return (
      <AttachmentGroup
        variant={presentation === 'tile' ? 'grid' : presentation === 'compact' ? 'inline' : 'list'}
      >
        <Attachment {...props} preview={{ kind: 'text', text: 'Synthetic review notes.' }} />
        <Attachment
          {...props}
          name="Owner review.svg"
          mediaType="image/svg+xml"
          preview={image}
          sizeBytes={undefined}
        />
        <Attachment
          {...props}
          name="Supporting evidence.csv"
          state="failed"
          detail="Upload interrupted"
        />
      </AttachmentGroup>
    );
  return <Attachment {...props} />;
}

interface LocalAttachment {
  id: string;
  file: File;
  preview?: AttachmentProps['preview'];
}
export function AttachmentComposer({ variant }: { variant: ComponentVariant<'PromptInput'> }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<LocalAttachment[]>([]);
  const [notice, setNotice] = useState('');
  const urls = useRef(new Set<string>());
  useEffect(() => {
    const owned = urls.current;
    return () => {
      for (const url of owned) URL.revokeObjectURL(url);
      owned.clear();
    };
  }, []);
  function release(file: LocalAttachment) {
    if (file.preview && file.preview.kind !== 'text') {
      URL.revokeObjectURL(file.preview.src);
      urls.current.delete(file.preview.src);
    }
  }
  return (
    <div>
      <PromptInput
        variant={variant}
        value={text}
        onValueChange={setText}
        allowEmptySubmit={files.length > 0}
        toolbar={
          <AttachmentPicker
            accept="image/*,.txt,.csv,.pdf"
            maxFileBytes={5 * 1024 * 1024}
            remainingSlots={3 - files.length}
            onFilesSelected={(picked) => {
              const added = picked.map((file) => {
                let preview: LocalAttachment['preview'];
                if (file.type.startsWith('image/')) {
                  const src = URL.createObjectURL(file);
                  urls.current.add(src);
                  preview = { kind: 'image', src, alt: file.name };
                }
                return { id: crypto.randomUUID(), file, preview };
              });
              setFiles((previous) => [...previous, ...added]);
            }}
          />
        }
        attachments={
          files.length ? (
            <AttachmentGroup label="Draft attachments">
              <>
                {files.map((item) => (
                  <Attachment
                    key={item.id}
                    variant="compact"
                    name={item.file.name}
                    state="selected"
                    sizeBytes={item.file.size}
                    mediaType={item.file.type}
                    detail="Local file · not uploaded"
                    preview={item.preview}
                    onRemove={() => {
                      release(item);
                      setFiles((previous) => previous.filter((value) => value.id !== item.id));
                    }}
                  />
                ))}
              </>
            </AttachmentGroup>
          ) : undefined
        }
        onSubmit={(message) => {
          setNotice(
            `Demo received ${message ? 'text and ' : ''}${files.length} local file${files.length === 1 ? '' : 's'}. No upload or model request was made.`,
          );
          files.forEach(release);
          setFiles([]);
          setText('');
        }}
      />
      <p className="specimen-feedback" role="status">
        {notice}
      </p>
      <p className="variant-note">
        Local demo: up to 3 files, 5 MiB each. The host handles upload, validation and storage in an
        integration.
      </p>
    </div>
  );
}
